// PM2 process definition — run once with `pm2 start ecosystem.config.js`
// Bakes NODE_ENV=production in so every future `pm2 restart broker` keeps
// the static-frontend serving active (avoids the JSON-404 bug).
//
// cwd MUST be the server directory: config.ts loads server/.env through
// dotenv, and dotenv resolves `.env` relative to the process cwd. With cwd at
// the repo root it injects 0 variables and the app exits with
// "Missing required environment variable: JWT_ACCESS_SECRET". It also keeps
// BACKUP_DIR anchored inside server/ instead of the repo root.
const path = require("path");

module.exports = {
  apps: [
    {
      name: "broker",
      cwd: path.join(__dirname, "server"),
      script: "dist/index.js",
      env: {
        NODE_ENV: "production",
        SERVER_PORT: 4000,
      },
    },
  ],
};
