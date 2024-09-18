module.exports = {
  apps: [
    {
      name: "facturador",
      script: "dist/index.js", // Assuming output is in dist/
      cwd: "./facturador",
      env: {
        PORT: 3002,
        NODE_ENV: "production",
      },
    },
    {
      name: "previsiones",
      script: "dist/index.js", // Assuming output is in dist/
      cwd: "./previsiones",
      env: {
        PORT: 3001,
        NODE_ENV: "production",
      },
    },
  ],
};
