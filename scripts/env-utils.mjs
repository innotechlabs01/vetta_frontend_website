import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import process from "node:process";

function resolveExecutable(command) {
  if (process.platform !== "win32") {
    return command;
  }

  if (command === "npm") {
    return "npm.cmd";
  }

  if (command === "npx") {
    return "npx.cmd";
  }

  return command;
}

export function loadEnvFileOrExit(envFile) {
  if (!envFile) {
    console.error("Missing env file argument.");
    process.exit(1);
  }

  if (!existsSync(envFile)) {
    console.error(`Missing env file: ${envFile}`);
    process.exit(1);
  }

  process.loadEnvFile(envFile);
}

export function requireEnv(names) {
  const missing = names.filter((name) => !process.env[name]);

  if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(", ")}`);
    process.exit(1);
  }
}

export async function runCommand(command, args = []) {
  await new Promise((resolve, reject) => {
    const child = spawn(resolveExecutable(command), args, {
      stdio: "inherit",
      env: process.env,
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`${command} exited with signal ${signal}`));
        return;
      }

      if (code && code !== 0) {
        reject(new Error(`${command} exited with code ${code}`));
        return;
      }

      resolve();
    });
  }).catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

export async function runCommandWithInput(command, args = [], input = "") {
  await new Promise((resolve, reject) => {
    const child = spawn(resolveExecutable(command), args, {
      stdio: ["pipe", "inherit", "inherit"],
      env: process.env,
    });

    child.on("error", reject);
    child.stdin.end(input);
    child.on("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`${command} exited with signal ${signal}`));
        return;
      }

      if (code && code !== 0) {
        reject(new Error(`${command} exited with code ${code}`));
        return;
      }

      resolve();
    });
  }).catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
