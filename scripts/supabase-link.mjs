import process from "node:process";
import { loadEnvFileOrExit, requireEnv, runCommand } from "./env-utils.mjs";

loadEnvFileOrExit(".env.supabase.local");
requireEnv(["SUPABASE_ACCESS_TOKEN", "SUPABASE_PROJECT_REF"]);

const args = ["supabase", "link", "--project-ref", process.env.SUPABASE_PROJECT_REF, "--yes"];

if (process.env.SUPABASE_DB_PASSWORD) {
  args.push("--password", process.env.SUPABASE_DB_PASSWORD);
}

await runCommand("npx", args);
