module.exports = {
  apps: [
    {
      name: 'tisoda-strapi',
      script: './node_modules/@strapi/strapi/bin/strapi.js',
      args: 'start',
      cwd: '/root/app/tisoda-strapi',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 1337
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      time: true
    }
  ]
};
