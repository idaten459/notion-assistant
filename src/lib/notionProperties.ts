import { matchExistingCategory } from "./categories";
import type { EnrichmentCandidate, NotionPropertySchema, SelectOption } from "./types";

export const RESTAURANT_PROPERTIES = {
  name: "店名",
  status: "ステータス",
  category: "カテゴリ",
  location: "場所",
  url: "URL",
  review: "感想",
  enrichmentStatus: "補完状態",
  enrichmentCandidates: "補完候補",
  googlePlaceId: "Google Place ID",
  canonicalGoogleMapsUrl: "正規Google Maps URL",
  lastEnrichedAt: "最終補完日時",
  source: "取得元"
} as const;

export const ENRICHMENT_STATUS = {
  pending: "未補完",
  candidate: "補完候補あり",
  complete: "補完済",
  failed: "補完失敗"
} as const;

export type NotionPropertiesPayload = Record<string, unknown>;
export type NotionPageProperties = Record<string, NotionPagePropertyValue>;

interface NotionPagePropertyValue {
  id?: string;
  type?: string;
  title?: Array<{ plain_text?: string }>;
  rich_text?: Array<{ plain_text?: string }>;
  url?: string | null;
  select?: { name?: string } | null;
  multi_select?: Array<{ name?: string }>;
  status?: { name?: string } | null;
  date?: { start?: string } | null;
}

export function buildCreateProperties(
  schema: Record<string, NotionPropertySchema>,
  input: {
    url: string;
    candidate: EnrichmentCandidate;
    review?: string;
    autoWriteThreshold: number;
  }
): NotionPropertiesPayload {
  const properties: NotionPropertiesPayload = {};
  const title = input.candidate.name || input.url;

  setTextLike(properties, schema, RESTAURANT_PROPERTIES.name, title, "title");
  setOption(properties, schema, RESTAURANT_PROPERTIES.status, "未達");
  setTextLike(properties, schema, RESTAURANT_PROPERTIES.location, input.candidate.location, "rich_text");
  setUrl(properties, schema, RESTAURANT_PROPERTIES.url, input.url);
  setTextLike(properties, schema, RESTAURANT_PROPERTIES.review, input.review, "rich_text");

  const category = resolveExistingCategory(schema[RESTAURANT_PROPERTIES.category], input.candidate.category);
  if (category && input.candidate.confidence >= input.autoWriteThreshold) {
    setOption(properties, schema, RESTAURANT_PROPERTIES.category, category);
  }

  setOperationalProperties(properties, schema, input.candidate, input.autoWriteThreshold);
  return properties;
}

export function buildUpdateProperties(
  schema: Record<string, NotionPropertySchema>,
  existing: NotionPageProperties,
  input: {
    url: string;
    candidate: EnrichmentCandidate;
    autoWriteThreshold: number;
  }
): NotionPropertiesPayload {
  const properties: NotionPropertiesPayload = {};
  const highConfidence = input.candidate.confidence >= input.autoWriteThreshold;

  if (!readPlainText(existing[RESTAURANT_PROPERTIES.name])) {
    setTextLike(properties, schema, RESTAURANT_PROPERTIES.name, input.candidate.name, "title");
  }

  if (!readOption(existing[RESTAURANT_PROPERTIES.status])) {
    setOption(properties, schema, RESTAURANT_PROPERTIES.status, "未達");
  }

  if (!readPlainText(existing[RESTAURANT_PROPERTIES.location])) {
    setTextLike(properties, schema, RESTAURANT_PROPERTIES.location, input.candidate.location, "rich_text");
  }

  if (!readUrl(existing[RESTAURANT_PROPERTIES.url])) {
    setUrl(properties, schema, RESTAURANT_PROPERTIES.url, input.url);
  }

  if (!readOption(existing[RESTAURANT_PROPERTIES.category]) && highConfidence) {
    const category = resolveExistingCategory(schema[RESTAURANT_PROPERTIES.category], input.candidate.category);
    if (category) {
      setOption(properties, schema, RESTAURANT_PROPERTIES.category, category);
    }
  }

  setOperationalProperties(properties, schema, input.candidate, input.autoWriteThreshold);
  return properties;
}

export function buildFailureProperties(
  schema: Record<string, NotionPropertySchema>,
  message: string
): NotionPropertiesPayload {
  const properties: NotionPropertiesPayload = {};
  setOption(properties, schema, RESTAURANT_PROPERTIES.enrichmentStatus, ENRICHMENT_STATUS.failed);
  setTextLike(properties, schema, RESTAURANT_PROPERTIES.enrichmentCandidates, message, "rich_text");
  setDate(properties, schema, RESTAURANT_PROPERTIES.lastEnrichedAt, new Date());
  return properties;
}

export function readPageUrl(properties: NotionPageProperties): string | undefined {
  return readUrl(properties[RESTAURANT_PROPERTIES.url]);
}

export function isPageAlreadyHandled(properties: NotionPageProperties): boolean {
  const status = readOption(properties[RESTAURANT_PROPERTIES.enrichmentStatus]);
  return status === ENRICHMENT_STATUS.complete || status === ENRICHMENT_STATUS.candidate;
}

export function requiredPropertyNames(): string[] {
  return [
    RESTAURANT_PROPERTIES.name,
    RESTAURANT_PROPERTIES.status,
    RESTAURANT_PROPERTIES.category,
    RESTAURANT_PROPERTIES.location,
    RESTAURANT_PROPERTIES.url,
    RESTAURANT_PROPERTIES.review
  ];
}

export function operationalPropertyDefinitions(): Record<string, unknown> {
  return {
    [RESTAURANT_PROPERTIES.enrichmentStatus]: {
      select: {
        options: [
          { name: ENRICHMENT_STATUS.pending, color: "gray" },
          { name: ENRICHMENT_STATUS.candidate, color: "yellow" },
          { name: ENRICHMENT_STATUS.complete, color: "green" },
          { name: ENRICHMENT_STATUS.failed, color: "red" }
        ]
      }
    },
    [RESTAURANT_PROPERTIES.enrichmentCandidates]: { rich_text: {} },
    [RESTAURANT_PROPERTIES.googlePlaceId]: { rich_text: {} },
    [RESTAURANT_PROPERTIES.canonicalGoogleMapsUrl]: { url: {} },
    [RESTAURANT_PROPERTIES.lastEnrichedAt]: { date: {} },
    [RESTAURANT_PROPERTIES.source]: {
      multi_select: {
        options: [
          { name: "Google Places", color: "blue" },
          { name: "HTML/OGP", color: "gray" },
          { name: "URL解析", color: "yellow" },
          { name: "AI分類", color: "purple" }
        ]
      }
    }
  };
}

function setOperationalProperties(
  properties: NotionPropertiesPayload,
  schema: Record<string, NotionPropertySchema>,
  candidate: EnrichmentCandidate,
  autoWriteThreshold: number
): void {
  const status =
    candidate.confidence >= autoWriteThreshold ? ENRICHMENT_STATUS.complete : ENRICHMENT_STATUS.candidate;
  const summary = JSON.stringify(
    {
      name: candidate.name,
      category: candidate.category,
      location: candidate.location,
      address: candidate.address,
      confidence: candidate.confidence,
      source: candidate.sourceLabel,
      reason: candidate.reason
    },
    null,
    2
  );

  setOption(properties, schema, RESTAURANT_PROPERTIES.enrichmentStatus, status);
  setTextLike(properties, schema, RESTAURANT_PROPERTIES.enrichmentCandidates, summary, "rich_text");
  setTextLike(properties, schema, RESTAURANT_PROPERTIES.googlePlaceId, candidate.googlePlaceId, "rich_text");
  setUrl(properties, schema, RESTAURANT_PROPERTIES.canonicalGoogleMapsUrl, candidate.googleMapsUrl);
  setDate(properties, schema, RESTAURANT_PROPERTIES.lastEnrichedAt, new Date());
  setOption(properties, schema, RESTAURANT_PROPERTIES.source, candidate.sourceLabel);
}

function setTextLike(
  payload: NotionPropertiesPayload,
  schema: Record<string, NotionPropertySchema>,
  name: string,
  value: string | undefined,
  preferredType: "title" | "rich_text"
): void {
  if (!value) {
    return;
  }

  const property = schema[name];
  if (!property) {
    return;
  }

  if (property.type === "title" || preferredType === "title") {
    payload[name] = {
      title: [{ text: { content: value.slice(0, 2000) } }]
    };
    return;
  }

  if (property.type === "rich_text") {
    payload[name] = {
      rich_text: [{ text: { content: value.slice(0, 2000) } }]
    };
    return;
  }

  if (property.type === "select" || property.type === "status" || property.type === "multi_select") {
    setOption(payload, schema, name, value);
  }
}

function setUrl(
  payload: NotionPropertiesPayload,
  schema: Record<string, NotionPropertySchema>,
  name: string,
  value: string | undefined
): void {
  if (!value || !schema[name]) {
    return;
  }

  if (schema[name].type === "url") {
    payload[name] = { url: value };
    return;
  }

  setTextLike(payload, schema, name, value, "rich_text");
}

function setDate(
  payload: NotionPropertiesPayload,
  schema: Record<string, NotionPropertySchema>,
  name: string,
  value: Date
): void {
  if (schema[name]?.type !== "date") {
    return;
  }

  payload[name] = {
    date: { start: value.toISOString() }
  };
}

function setOption(
  payload: NotionPropertiesPayload,
  schema: Record<string, NotionPropertySchema>,
  name: string,
  value: string | undefined
): void {
  if (!value) {
    return;
  }

  const property = schema[name];
  if (!property) {
    return;
  }

  if (property.type === "status") {
    payload[name] = { status: { name: value } };
    return;
  }

  if (property.type === "select") {
    payload[name] = { select: { name: value } };
    return;
  }

  if (property.type === "multi_select") {
    payload[name] = { multi_select: [{ name: value }] };
  }
}

function resolveExistingCategory(
  schema: NotionPropertySchema | undefined,
  desiredCategory: string | undefined
): string | undefined {
  if (!schema) {
    return undefined;
  }

  const options = optionList(schema);
  return matchExistingCategory(desiredCategory, options);
}

function optionList(schema: NotionPropertySchema): SelectOption[] {
  if (schema.type === "select") {
    return schema.select?.options || [];
  }

  if (schema.type === "multi_select") {
    return schema.multi_select?.options || [];
  }

  if (schema.type === "status") {
    return schema.status?.options || [];
  }

  return [];
}

function readPlainText(property: NotionPagePropertyValue | undefined): string | undefined {
  if (!property) {
    return undefined;
  }

  const text =
    property.title?.map((item) => item.plain_text).join("") ||
    property.rich_text?.map((item) => item.plain_text).join("");
  return text || undefined;
}

function readUrl(property: NotionPagePropertyValue | undefined): string | undefined {
  return property?.url || readPlainText(property);
}

function readOption(property: NotionPagePropertyValue | undefined): string | undefined {
  if (!property) {
    return undefined;
  }

  return (
    property.status?.name ||
    property.select?.name ||
    property.multi_select?.map((item) => item.name).filter(Boolean).join(", ")
  );
}
