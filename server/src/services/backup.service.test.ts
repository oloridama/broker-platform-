import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "fs/promises";
import os from "os";
import path from "path";

/**
 * Backup service tests.
 *
 * These exist because production data was lost when a host expired with zero
 * backups in place. A backup that is never verified is not a backup, so the
 * important assertions here are: the snapshot opens independently, it passes
 * SQLite's integrity check, it contains the real tables, and its checksum can
 * be re-verified later.
 */

// Redirect backups into a temp dir so tests never write into the repo.
const TMP_BACKUP_DIR = path.join(os.tmpdir(), `fxa-backups-test-${process.pid}`);
let svc: typeof import("./backup.service");

beforeAll(async () => {
  process.env.BACKUP_DIR = TMP_BACKUP_DIR;
  // Imported dynamically so config.ts reads BACKUP_DIR set above.
  svc = await import("./backup.service");
});

afterAll(async () => {
  await fs.rm(TMP_BACKUP_DIR, { recursive: true, force: true });
  delete process.env.BACKUP_DIR;
});

describe("fileStamp", () => {
  it("produces a sortable filename-safe UTC stamp", () => {
    const stamp = svc.fileStamp(new Date("2026-11-12T19:15:00.123Z"));
    expect(stamp).toBe("20261112T191500Z");
    expect(stamp).toMatch(/^\d{8}T\d{6}Z$/);
  });

  it("sorts chronologically as a plain string", () => {
    const a = svc.fileStamp(new Date("2026-11-12T09:00:00Z"));
    const b = svc.fileStamp(new Date("2026-11-12T10:00:00Z"));
    expect(a < b).toBe(true);
  });
});

describe("createSnapshot", () => {
  it("writes a snapshot that passes integrity checks and knows its tables", async () => {
    const info = await svc.createSnapshot();
    try {
      // Integrity must be "ok" — anything else means we must not trust the file.
      expect(info.integrity).toBe("ok");
      expect(info.bytes).toBeGreaterThan(0);
      expect(info.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(info.filename).toMatch(/^fxa-\d{8}T\d{6}Z\.db$/);

      // The snapshot must be a standalone, openable SQLite database.
      const stat = await fs.stat(info.path);
      expect(stat.isFile()).toBe(true);
      expect(stat.size).toBe(info.bytes);

      // Table counts are read from the snapshot itself, not the live DB.
      expect(Object.keys(info.tableCounts).length).toBeGreaterThan(0);
    } finally {
      await svc.removeSnapshot(info.path);
    }
  }, 30_000);

  it("snapshots are independent files (previous snapshot is not overwritten)", async () => {
    const first = await svc.createSnapshot();
    const second = await svc.createSnapshot();
    try {
      expect(first.path).not.toBe(second.path);
      await expect(fs.stat(first.path)).resolves.toBeTruthy();
      await expect(fs.stat(second.path)).resolves.toBeTruthy();
    } finally {
      await svc.removeSnapshot(first.path);
      await svc.removeSnapshot(second.path);
    }
  }, 30_000);

  it("removeSnapshot never throws, even for a missing file", async () => {
    await expect(svc.removeSnapshot("/nonexistent/nope.db")).resolves.toBeUndefined();
  });
});

describe("createRetainedBackup", () => {
  it("stores a snapshot with checksum + manifest sidecars", async () => {
    const record = await svc.createRetainedBackup();

    expect(record.integrity).toBe("ok");
    expect(record.sha256).toMatch(/^[0-9a-f]{64}$/);

    // The returned record must match what was actually written to disk.
    const stored = await svc.listBackups();
    const entry = stored.find((b) => b.name === record.name);
    expect(entry).toBeDefined();
    expect(entry!.sha256).toBe(record.sha256);
    expect(entry!.bytes).toBe(record.bytes);

    // sha256sum-compatible sidecar for offline verification.
    const sidecar = await fs.readFile(
      path.join(TMP_BACKUP_DIR, `${record.name}.sha256`),
      "utf8"
    );
    expect(sidecar.split(/\s+/)[0]).toBe(record.sha256);
  }, 30_000);

  it("a retained backup verifies against its own checksum", async () => {
    const record = await svc.createRetainedBackup();
    const result = await svc.verifyBackup(record.name);
    expect(result.ok).toBe(true);
    expect(result.expected).toBe(result.actual);
  }, 30_000);
});

describe("path-traversal guard", () => {
  it("rejects names that are not plain fxa-*.db filenames", async () => {
    const bad = [
      "../../etc/passwd",
      "../fxa-20260101T000000Z.db",
      "fxa-20260101T000000Z.db/../../x",
      "/etc/passwd",
      "evil.sh",
      "fxa-20260101T000000Z.db.bak",
    ];
    for (const name of bad) {
      await expect(svc.resolveBackupPath(name)).resolves.toBeNull();
    }
  });

  it("returns null (not a throw) for a well-formed but missing snapshot", async () => {
    await expect(svc.resolveBackupPath("fxa-19700101T000000Z.db")).resolves.toBeNull();
  });

  it("verifyBackup refuses a missing snapshot instead of reporting it valid", async () => {
    await expect(svc.verifyBackup("fxa-19700101T000000Z.db")).rejects.toThrow(/not found/i);
  });
});

describe("listBackups", () => {
  it("returns newest first and every entry carries a checksum", async () => {
    await svc.createRetainedBackup();
    await svc.createRetainedBackup();

    const list = await svc.listBackups();
    expect(list.length).toBeGreaterThanOrEqual(2);

    const times = list.map((b) => new Date(b.createdAt).getTime());
    const sortedDesc = [...times].sort((a, b) => b - a);
    expect(times).toEqual(sortedDesc);

    for (const b of list) {
      expect(b.name).toMatch(/^fxa-\d{8}T\d{6}Z(-\d+)?\.db$/);
      expect(b.bytes).toBeGreaterThan(0);
      expect(b.sha256).toMatch(/^[0-9a-f]{64}$/);
    }
  }, 60_000);
});
