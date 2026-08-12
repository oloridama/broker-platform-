// PM2 process definition — run once with `pm2 start ecosystem.config.js`
// Bakes NODE_ENV=production in so every future `pm2 restart broker` keeps
// the static-frontend serving active (avoids the JSON-404 bug).
module.exports = {
  apps: [
    {
      name: "broker",
      script: "server/dist/index.js",
      env: {
        NODE_ENV: "production",
        SERVER_PORT: 4000,
      },
    },
  ],
};
