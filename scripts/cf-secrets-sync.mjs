import { readFileSync } from "node:fs";
import { runCommandWithInput } from "./env-utils.mjs";

const envFile = ".env.production.secrets";
const fileContents = readFileSync(envFile, "utf8");

const entries = fileContents
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith("#"))
  .map((line) => {
    const separatorIndex = line.indexOf("=");

    if (separatorIndex === -1) {
      return null;
    }

    return {
      key: line.slice(0, separatorIndex).trim(),
      value: line.slice(separatorIndex + 1),
    };
  })
  .filter(Boolean);

for (const entry of entries) {
  if (entry.key.startsWith("NEXT_PUBLIC_")) {
    continue;
  }

  console.log(`Syncing secret ${entry.key}...`);
  await runCommandWithInput("npx", ["wrangler", "secret", "put", entry.key], entry.value);
}
