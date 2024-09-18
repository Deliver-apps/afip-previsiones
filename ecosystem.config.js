module.exports = {
  apps: [
    {
      name: "previsiones",
      script: "backend/previsiones/dist/index.js",
      cwd: "/app",
      env: {
        PORT: process.env.PREVISIONES_PORT || 3001,
        NODE_ENV: "production",
        PUPPETEER_SKIP_CHROMIUM_DOWNLOAD: "true",
        PUPPETEER_EXECUTABLE_PATH: "/usr/bin/google-chrome-stable",
      },
    },
    {
      name: "facturador",
      script: "backend/facturador/dist/index.js",
      cwd: "/app",
      env: {
        PORT: process.env.FACTURADOR_PORT || 3002,
        NODE_ENV: "production",
      },
    },
    {
      name: "nginx",
      script: "nginx",
      args: ["-g", "daemon off;"],
      exec_mode: "fork",
      env: {
        PORT: process.env.PORT || 8080,
      },
    },
  ],
};
