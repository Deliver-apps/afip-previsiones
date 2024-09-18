module.exports = {
  apps: [
    {
      name: "previsiones",
      script: "backend/previsiones/dist/index.js",
      env: {
        PORT: 3001,
        NODE_ENV: "production",
      },
    },
    {
      name: "facturador",
      script: "backend/facturador/dist/index.js",
      env: {
        PORT: 3002,
        NODE_ENV: "production",
      },
    },
    {
      name: "nginx",
      script: "nginx",
      args: ["-g", "daemon off;"],
      exec_mode: "fork",
    },
  ],
};
