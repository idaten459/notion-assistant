import type { RuntimeConfig } from "./types";

function parseNumber(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function getConfig(): RuntimeConfig {
  return {
    notionToken: process.env.NOTION_TOKEN,
    notionDataSourceId: process.env.NOTION_DATA_SOURCE_ID,
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
    notionWebhookVerificationToken: process.env.NOTION_WEBHOOK_VERIFICATION_TOKEN,
    cronSecret: process.env.CRON_SECRET,
    defaultRegionCode: process.env.DEFAULT_REGION_CODE || "JP",
    defaultLanguage: process.env.DEFAULT_LANGUAGE || "ja",
    autoWriteThreshold: parseNumber(process.env.AUTO_WRITE_THRESHOLD, 0.8),
    appPassword: process.env.APP_PASSWORD,
    enableAiClassifier: process.env.ENABLE_AI_CLASSIFIER === "true"
  };
}

export function requireConfigValue(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`${name} is not configured`);
  }

  return value;
}
