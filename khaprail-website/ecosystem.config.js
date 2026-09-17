// PM2 process manager config for the Hostinger VPS deploy.
// Run on the VPS with: pm2 start ecosystem.config.js
// Then: pm2 save && pm2 startup   (so it also restarts on server reboot)
//
// This file is loaded as an ES module (package.json has "type": "module"),
// hence `export default` rather than `module.exports`.
export default {
  apps: [
    {
      name: "khaprail-website",
      script: "npm",
      args: "start",
      cwd: import.meta.dirname,
      env: {
        NODE_ENV: "production",
      },
      autorestart: true,
      max_restarts: 10,
      restart_delay: 2000,
      watch: false,
      out_file: "logs/out.log",
      error_file: "logs/error.log",
      time: true,
    },
  ],
}
