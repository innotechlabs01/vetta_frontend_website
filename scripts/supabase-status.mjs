import { readFileSync, existsSync } from "node:fs";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { loadEnvFileOrExit, requireEnv } from "./env-utils.mjs";

loadEnvFileOrExit(".env.supabase.local");
requireEnv(["SUPABASE_ACCESS_TOKEN", "SUPABASE_PROJECT_REF"]);

const output = execFileSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["supabase", "projects", "list", "-o", "json"],
  {
    encoding: "utf8",
    env: process.env,
  },
);

const projects = JSON.parse(output);
const project = projects.find((item) => item.ref === process.env.SUPABASE_PROJECT_REF);

if (!project) {
  console.error(`Supabase project ref ${process.env.SUPABASE_PROJECT_REF} is not accessible with the configured token.`);
  process.exit(1);
}

const linkedRefPath = "supabase/.temp/project-ref";
const linkedRef = existsSync(linkedRefPath) ? readFileSync(linkedRefPath, "utf8").trim() : null;
const linkedStatus = linkedRef === process.env.SUPABASE_PROJECT_REF ? "yes" : "no";

console.log(`Supabase token OK`);
console.log(`Project: ${project.name} (${project.ref})`);
console.log(`Region: ${project.region}`);
console.log(`Status: ${project.status}`);
console.log(`Locally linked: ${linkedStatus}`);
