import { spawn } from "node:child_process";
let active;
function run(args) {
  return new Promise((resolve, reject) => {
    active = spawn(
      process.execPath,
      ["node_modules/next/dist/bin/next", ...args],
      { stdio: "inherit", env: { ...process.env, NODE_ENV: "production" } },
    );
    active.on("error", reject);
    active.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`Next exited ${code}`)),
    );
  });
}
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => {
    active?.kill(signal);
    process.exit(0);
  });
try {
  await run(["build"]);
  await run(["start", "--hostname", "127.0.0.1", "--port", "3101"]);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
