module.exports = {
  apps: [
    {
      name: 'tisoda-strapi',
      script: './node_modules/@strapi/strapi/bin/strapi.js',
      args: 'start',
      cwd: '/root/app/tisoda-strapi',
      instances: 1, // Strapi không hỗ trợ tốt cluster mode
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '2G', // Tăng memory limit
      env: {
        NODE_ENV: 'production',
        PORT: 1337,
        NODE_OPTIONS: '--max-old-space-size=2048' // Tối ưu Node.js memory
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      time: true
    }
  ]
};
