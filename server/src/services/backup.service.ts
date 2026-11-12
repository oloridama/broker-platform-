import fs from "fs";
import fsp from "fs/promises";
import os from "os";
import path from "path";
import crypto from "crypto";
import { createGzip } from "zlib";
import { exec } from "child_process";
import { promisify } from "util";
import type { Response } from "express";
import { PrismaClient } from "@prisma/client";
import { prisma } from "../db";
import { config } from "../config";

const execAsync = promisify(exec);

/**
 * Online database backups.
 *
 * Uses SQLite's `VACUUM INTO`, which writes a transactionally-consistent
 * snapshot while the app keeps serving traffic. The snapshot is then
 * integrity-checked, hashed, and streamed to the caller.
 *
 * Why this exists: the previous deployment had NO backups whatsoever, so an
 * expired host destroyed the entire user database. Every backup produced here
 * is verified before it is handed out, and verification failure is a hard error
 * (we never present an unverified file as a backup).
 */

export interface SnapshotInfo {
  /** Absolute path to the temporary snapshot file (caller must clean up). */
  path: string;
  /** Suggested download filename, e.g. fxa-20261112T191500Z.db */
  filename: string;
  bytes: number;
  sha256: string;
  /** "ok" when PRAGMA integrity_check passed. */
  integrity: string;
  /** Row counts per table, read from the snapshot itself. */
  tableCounts: Record<string, number>;
}

/** Escape a filesystem path for use inside a single-quoted SQL literal. */
function sqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

/** Compact UTC timestamp suitable for filenames: 20261112T191500Z */
export function fileStamp(now: Date = new Date()): string {
  return now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

async function hashFile(filePath: string): Promise<string> {
  const hash = crypto.createHash("sha256");
  await new Promise<void>((resolve, reject) => {
    fs.createReadStream(filePath)
      .on("data", (chunk) => hash.update(chunk))
      .on("error", reject)
      .on("end", () => resolve());
  });
  return hash.digest("hex");
}

/** True when the path exists. */
async function exists(p: string): Promise<boolean> {
  try {
    await fsp.access(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * Create a verified snapshot of the live database.
 * @throws if the snapshot cannot be written or fails the integrity check.
 */
export async function createSnapshot(): Promise<SnapshotInfo> {
  const stamp = fileStamp();
  const filename = `fxa-${stamp}.db`;
  // Random component: two snapshots in the same second must not collide, and
  // VACUUM INTO refuses to overwrite an existing file.
  const dest = path.join(
    os.tmpdir(),
    `fxa-backup-${process.pid}-${stamp}-${crypto.randomBytes(4).toString("hex")}.db`
  );

  // VACUUM INTO refuses to overwrite, so clear any stale file first.
  await fsp.rm(dest, { force: true });

  try {
    await prisma.$executeRawUnsafe(`VACUUM INTO ${sqlString(dest)}`);
  } catch (err) {
    await fsp.rm(dest, { force: true });
    throw new Error(
      `Could not create database snapshot: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  try {
    // Verify the snapshot ITSELF, not the live database. This uses a dedicated
    // client opened against the snapshot file: ATTACH cannot be used reliably
    // here because it is per-connection state and Prisma pools connections
    // (the attach and the following queries can land on different ones).
    const { integrity, tableCounts } = await verifySnapshotFile(dest);

    const stat = await fsp.stat(dest);
    if (stat.size === 0) throw new Error("Snapshot is empty");

    return {
      path: dest,
      filename,
      bytes: stat.size,
      sha256: await hashFile(dest),
      integrity,
      tableCounts,
    };
  } catch (err) {
    await fsp.rm(dest, { force: true });
    throw err;
  }
}

/**
 * Open the snapshot as its own database and prove it is trustworthy:
 * `PRAGMA integrity_check` must return "ok" and the expected tables must be
 * readable. Throws when the file cannot be opened or fails either check.
 */
async function verifySnapshotFile(
  filePath: string
): Promise<{ integrity: string; tableCounts: Record<string, number> }> {
  let client: PrismaClient | null = null;
  try {
    client = new PrismaClient({ datasources: { db: { url: `file:${filePath}` } } });

    const check = await client.$queryRawUnsafe<{ integrity_check: string }[]>(
      "PRAGMA integrity_check"
    );
    const integrity = check?.[0]?.integrity_check ?? "unknown";
    if (integrity !== "ok") {
      throw new Error(`Snapshot integrity check failed: ${integrity}`);
    }

    const tables = await client.$queryRawUnsafe<{ name: string }[]>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma%' ORDER BY name"
    );
    if (tables.length === 0) {
      throw new Error("Snapshot contains no tables");
    }

    const tableCounts: Record<string, number> = {};
    for (const { name } of tables) {
      // Names come from the snapshot's own catalogue and are quoted.
      const q = `"${name.replace(/"/g, '""')}"`;
      const rows = await client.$queryRawUnsafe<{ n: number | bigint }[]>(
        `SELECT COUNT(*) AS n FROM ${q}`
      );
      tableCounts[name] = Number(rows?.[0]?.n ?? 0);
    }

    return { integrity, tableCounts };
  } finally {
    await client?.$disconnect().catch(() => {});
  }
}

/** Best-effort removal of a temporary snapshot. Never throws. */
export async function removeSnapshot(filePath: string): Promise<void> {
  await fsp.rm(filePath, { force: true }).catch(() => {});
}

/**
 * Stream a snapshot to an HTTP response as gzip, then delete the temp file.
 * Verification headers are sent so the client can check the download later.
 */
export function streamSnapshot(res: Response, info: SnapshotInfo): void {
  const headers = {
    "Content-Type": "application/gzip",
    "Content-Disposition": `attachment; filename="${info.filename}.gz"`,
    "X-Backup-Integrity": info.integrity,
    "X-Backup-Sha256": info.sha256,
    "X-Backup-Bytes": String(info.bytes),
    "Cache-Control": "no-store",
  };
  res.setHeader("Access-Control-Expose-Headers", Object.keys(headers).join(", "));
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);

  const source = fs.createReadStream(info.path);
  const gzip = createGzip({ level: 9 });

  const cleanup = () => {
    source.destroy();
    gzip.destroy();
    void removeSnapshot(info.path);
  };

  source.on("error", () => {
    cleanup();
    if (!res.headersSent) res.status(500).json({ success: false, error: { code: "BACKUP_FAILED", message: "Backup stream failed" } });
    else res.end();
  });
  gzip.on("error", () => {
    cleanup();
    res.end();
  });
  res.on("close", cleanup);

  source.pipe(gzip).pipe(res);
}

// ────────────────────────────────────────────────────────
// Retained backups (on-disk, pruned, optionally off-box)
// ────────────────────────────────────────────────────────

export interface BackupRecord {
  /** Snapshot filename, e.g. fxa-20261112T191500Z.db */
  name: string;
  bytes: number;
  sha256: string;
  /** ISO timestamp parsed from the filename (or file mtime as fallback). */
  createdAt: string;
  integrity: string;
  tableCounts: Record<string, number>;
}

const SNAPSHOT_NAME = /^fxa-\d{8}T\d{6}Z(-\d+)?\.db$/;

/** True when the configured datasource is SQLite (VACUUM INTO is a SQLite feature). */
export function isSqlite(): boolean {
  return (process.env.DATABASE_URL || "file:./dev.db").startsWith("file:");
}

/** Absolute backup directory (created on demand). */
export function backupDir(): string {
  return path.resolve(process.cwd(), config.backup.dir);
}

async function ensureBackupDir(): Promise<string> {
  const dir = backupDir();
  await fsp.mkdir(dir, { recursive: true });
  return dir;
}

/** Parse fxa-YYYYMMDDTHHMMSSZ[-N].db back into a Date. */
function dateFromName(name: string): Date | null {
  const m = /^fxa-(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z(?:-\d+)?\.db$/.exec(name);
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m;
  return new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s));
}

/**
 * Move a freshly created snapshot into the backup directory, write its
 * checksum + manifest sidecars, prune old snapshots, and optionally push a
 * copy off the box.
 */
export async function commitSnapshot(info: SnapshotInfo): Promise<BackupRecord> {
  const dir = await ensureBackupDir();

  // Two snapshots within the same second share a timestamp, so disambiguate
  // rather than silently overwriting the earlier backup.
  let name = info.filename;
  let dest = path.join(dir, name);
  for (let i = 1; await exists(dest); i++) {
    name = info.filename.replace(/\.db$/, `-${i}.db`);
    dest = path.join(dir, name);
    if (i > 100) throw new Error("Could not find a free backup filename");
  }

  await fsp.rename(info.path, dest);

  // sha256sum-compatible sidecar so restores can be verified offline.
  await fsp.writeFile(`${dest}.sha256`, `${info.sha256}  ${name}\n`, "utf8");

  const record: BackupRecord = {
    name,
    bytes: info.bytes,
    sha256: info.sha256,
    createdAt: dateFromName(name)?.toISOString() ?? new Date().toISOString(),
    integrity: info.integrity,
    tableCounts: info.tableCounts,
  };

  await fsp.writeFile(`${dest}.json`, JSON.stringify(record, null, 2), "utf8");

  await pruneBackups();
  await pushOffBox(dest);

  return record;
}

/** Delete all but the newest `config.backup.retention` snapshots. */
export async function pruneBackups(): Promise<string[]> {
  const dir = await ensureBackupDir();
  const entries = (await fsp.readdir(dir)).filter((n) => SNAPSHOT_NAME.test(n)).sort();
  const excess = entries.slice(0, Math.max(0, entries.length - config.backup.retention));
  const removed: string[] = [];

  for (const name of excess) {
    const base = path.join(dir, name);
    for (const f of [base, `${base}.sha256`, `${base}.json`]) {
      await fsp.rm(f, { force: true }).catch(() => {});
    }
    removed.push(name);
  }

  if (removed.length) {
    console.log(`[backup] pruned ${removed.length} old snapshot(s): ${removed.join(", ")}`);
  }
  return removed;
}

/**
 * Copy the snapshot off the box using a user-supplied command.
 * Failure is logged but never thrown — a local backup is still a backup.
 */
async function pushOffBox(filePath: string): Promise<void> {
  const cmd = config.backup.remoteCmd.trim();
  if (!cmd) return;

  try {
    const quoted = `'${filePath.replace(/'/g, "'\\''")}'`;
    const { stdout, stderr } = await execAsync(cmd.replace(/\{file\}/g, quoted), {
      timeout: 120_000,
    });
    if (stdout.trim()) console.log(`[backup] off-box: ${stdout.trim()}`);
    if (stderr.trim()) console.warn(`[backup] off-box stderr: ${stderr.trim()}`);
  } catch (err) {
    // Loud, because a silent off-box failure is how data gets lost.
    console.error(
      `[backup] ⚠️  OFF-BOX COPY FAILED for ${path.basename(filePath)}: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }
}

/** List retained snapshots, newest first. */
export async function listBackups(): Promise<BackupRecord[]> {
  const dir = await ensureBackupDir();
  const names = (await fsp.readdir(dir)).filter((n) => SNAPSHOT_NAME.test(n)).sort().reverse();
  const records: BackupRecord[] = [];

  for (const name of names) {
    const base = path.join(dir, name);
    try {
      const manifest = JSON.parse(await fsp.readFile(`${base}.json`, "utf8")) as BackupRecord;
      records.push(manifest);
      continue;
    } catch {
      // No/invalid manifest — fall back to the file itself.
    }
    const stat = await fsp.stat(base);
    let sha256 = "";
    try {
      sha256 = (await fsp.readFile(`${base}.sha256`, "utf8")).split(/\s+/)[0] ?? "";
    } catch {
      sha256 = await hashFile(base);
    }
    records.push({
      name,
      bytes: stat.size,
      sha256,
      createdAt: dateFromName(name)?.toISOString() ?? stat.mtime.toISOString(),
      integrity: "unverified",
      tableCounts: {},
    });
  }

  return records;
}

/**
 * Resolve a snapshot name to an absolute path, rejecting anything that is not
 * a plain `fxa-*.db` filename in the backup directory (path-traversal guard).
 */
export async function resolveBackupPath(name: string): Promise<string | null> {
  if (!SNAPSHOT_NAME.test(name)) return null;
  const dir = await ensureBackupDir();
  const full = path.join(dir, name);
  if (path.dirname(full) !== dir) return null;
  try {
    const stat = await fsp.stat(full);
    return stat.isFile() ? full : null;
  } catch {
    return null;
  }
}

/** Verify a stored snapshot against its sidecar checksum. */
export async function verifyBackup(name: string): Promise<{ ok: boolean; expected: string; actual: string }> {
  const full = await resolveBackupPath(name);
  if (!full) throw new Error("Backup not found");
  const expected = (await fsp.readFile(`${full}.sha256`, "utf8").catch(() => "")).split(/\s+/)[0] || "";
  const actual = await hashFile(full);
  return { ok: Boolean(expected) && expected === actual, expected, actual };
}

/** Create a snapshot and keep it on disk. */
export async function createRetainedBackup(): Promise<BackupRecord> {
  if (!isSqlite()) {
    throw new Error("Automatic snapshots require the SQLite datasource (use pg_dump for Postgres)");
  }
  const info = await createSnapshot();
  try {
    return await commitSnapshot(info);
  } catch (err) {
    await removeSnapshot(info.path);
    throw err;
  }
}

/**
 * Automatic snapshot loop. Runs shortly after boot, then every
 * `BACKUP_INTERVAL_HOURS`. A failure is logged and retried on the next tick —
 * it never crashes the process.
 */
export function startBackupScheduler(): void {
  const hours = config.backup.intervalHours;
  if (!hours || hours <= 0) {
    console.log("[backup] automatic snapshots disabled (BACKUP_INTERVAL_HOURS=0)");
    return;
  }

  const run = async (label: string) => {
    try {
      const rec = await createRetainedBackup();
      const mb = (rec.bytes / 1024 / 1024).toFixed(2);
      console.log(
        `[backup] ${label} snapshot ${rec.name} (${mb} MB, integrity=${rec.integrity}, tables=${Object.keys(rec.tableCounts).length})`
      );
    } catch (err) {
      console.error(`[backup] ⚠️  ${label} snapshot FAILED: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Initial run 2 minutes after boot so startup isn't competing with it.
  const first = setTimeout(() => void run("initial"), 120_000);
  first.unref?.();

  const timer = setInterval(() => void run("scheduled"), hours * 3600_000);
  timer.unref?.();
  console.log(`[backup] automatic snapshots every ${hours}h → ${backupDir()} (keep ${config.backup.retention})`);
}
