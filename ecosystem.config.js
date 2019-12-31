module.exports = {
  apps: [
    {
      name: "test.min.js.ts",
      script: "./src/test.ts",
      max_memory_restart: "20M",
      exec_mode: "fork",
      env: {
        NODE_ENV: "development"
      }
    }
  ]
};
