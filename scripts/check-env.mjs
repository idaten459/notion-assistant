import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const REQUIRED = [
  "NOTION_TOKEN",
  "NOTION_DATA_SOURCE_ID",
  "GOOGLE_MAPS_API_KEY",
  "CRON_SECRET",
  "APP_PASSWORD"
];

const OPTIONAL = [
  "NOTION_WEBHOOK_VERIFICATION_TOKEN",
  "DEFAULT_REGION_CODE",
  "DEFAULT_LANGUAGE",
  "AUTO_WRITE_THRESHOLD",
  "ENABLE_AI_CLASSIFIER"
];

const env = {
  ...readDotEnvLocal(),
  ...process.env
};

const missing = REQUIRED.filter((key) => !env[key]);
if (missing.length > 0) {
  console.error(`Missing required deployment env vars: ${missing.join(", ")}`);
  process.exit(1);
}

const warnings = OPTIONAL.filter((key) => !env[key]);
console.log("Deployment env check passed.");
console.log(`Required: ${REQUIRED.map((key) => `${key}=set`).join(", ")}`);

if (warnings.length > 0) {
  console.log(`Optional not set: ${warnings.join(", ")}`);
}

function readDotEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) {
    return {};
  }

  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        const key = line.slice(0, index).trim();
        const value = line.slice(index + 1).trim().replace(/^["']|["']$/g, "");
        return [key, value];
      })
  );
}
