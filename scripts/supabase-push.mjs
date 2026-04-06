import process from "node:process";
import { loadEnvFileOrExit, requireEnv, runCommand } from "./env-utils.mjs";

const dryRun = process.argv.includes("--dry-run");

loadEnvFileOrExit(".env.supabase.local");
requireEnv(["SUPABASE_ACCESS_TOKEN", "SUPABASE_PROJECT_REF"]);

const linkArgs = ["supabase", "link", "--project-ref", process.env.SUPABASE_PROJECT_REF, "--yes"];
const pushArgs = ["supabase", "db", "push", "--linked", "--include-all", "--yes"];

if (dryRun) {
  pushArgs.push("--dry-run");
}

if (process.env.SUPABASE_DB_PASSWORD) {
  linkArgs.push("--password", process.env.SUPABASE_DB_PASSWORD);
  pushArgs.push("--password", process.env.SUPABASE_DB_PASSWORD);
}

await runCommand("npx", linkArgs);
await runCommand("npx", pushArgs);
