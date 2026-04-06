import process from "node:process";
import { loadEnvFileOrExit, runCommand } from "./env-utils.mjs";

const [, , envFile, command, ...args] = process.argv;

if (!envFile || !command) {
  console.error("Usage: node scripts/run-with-env.mjs <env-file> <command> [...args]");
  process.exit(1);
}

loadEnvFileOrExit(envFile);
await runCommand(command, args);
