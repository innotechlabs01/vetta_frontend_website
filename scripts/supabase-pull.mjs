import process from "node:process";
import { loadEnvFileOrExit, requireEnv, runCommand } from "./env-utils.mjs";

loadEnvFileOrExit(".env.supabase.local");
requireEnv(["SUPABASE_ACCESS_TOKEN", "SUPABASE_PROJECT_REF"]);

const linkArgs = ["supabase", "link", "--project-ref", process.env.SUPABASE_PROJECT_REF, "--yes"];
const pullArgs = ["supabase", "db", "pull"];

if (process.env.SUPABASE_DB_PASSWORD) {
  linkArgs.push("--password", process.env.SUPABASE_DB_PASSWORD);
  pullArgs.push("--password", process.env.SUPABASE_DB_PASSWORD);
}

await runCommand("npx", linkArgs);
await runCommand("npx", pullArgs);
