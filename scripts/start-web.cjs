const path = require("node:path");
const { spawn } = require("node:child_process");

const rootDir = path.resolve(__dirname, "..");
const appDir = path.join(rootDir, "apps/anugu2");
const viteCli = path.join(appDir, "node_modules/vite/bin/vite.js");

const vite = spawn(process.execPath, [viteCli, "--host", "0.0.0.0", "--port", "3000", "--strictPort"], {
  cwd: appDir,
  env: process.env,
  stdio: "inherit",
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => vite.kill(signal));
}

vite.on("error", (error) => {
  console.error("Could not start the Anagu Vite web app.", error);
  process.exitCode = 1;
});

vite.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exitCode = code ?? 1;
});
