module.exports = {
  apps: [
    {
      name: 'worldcup-ai-orchestrator',
      script: 'orchestrator/master.js',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      max_memory_restart: '500M',
      env: { NODE_ENV: 'production' },
    },
    {
      name: 'worldcup-ai-http',
      script: 'server.js',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      max_memory_restart: '300M',
      env: { NODE_ENV: 'production' },
    },
  ],
};
