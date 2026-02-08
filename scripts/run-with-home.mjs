import { spawn } from "node:child_process";
import { platform } from "node:os";

function ensureHome(env) {
  if (env.HOME) {
    return env;
  }

  if (platform() === "win32") {
    env.HOME =
      env.USERPROFILE ||
      (env.HOMEDRIVE && env.HOMEPATH ? `${env.HOMEDRIVE}${env.HOMEPATH}` : undefined);
  }

  return env;
}

const [command, ...args] = process.argv.slice(2);

if (!command) {
  console.error("Usage: node scripts/run-with-home.mjs <command> [args...]");
  process.exit(1);
}

const child = spawn(command, args, {
  stdio: "inherit",
  shell: true,
  env: ensureHome({ ...process.env }),
});

child.on("exit", (code) => process.exit(code ?? 1));