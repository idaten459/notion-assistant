export type EnrichmentSource =
  | "url_parser"
  | "html_metadata"
  | "google_places"
  | "ai_classifier";

export type EnrichmentStatus = "未補完" | "補完候補あり" | "補完済" | "補完失敗";

export type NotionPropertyType =
  | "title"
  | "rich_text"
  | "url"
  | "select"
  | "multi_select"
  | "status"
  | "date"
  | "checkbox"
  | string;

export interface SelectOption {
  id?: string;
  name: string;
  color?: string;
}

export interface NotionPropertySchema {
  id: string;
  name: string;
  type: NotionPropertyType;
  select?: { options: SelectOption[] };
  multi_select?: { options: SelectOption[] };
  status?: { options: SelectOption[]; groups?: unknown[] };
}

export interface NotionDataSource {
  object: "data_source";
  id: string;
  properties: Record<string, NotionPropertySchema>;
}

export interface GoogleMapsParseResult {
  isGoogleMapsUrl: boolean;
  placeId?: string;
  cid?: string;
  query?: string;
  coordinates?: { lat: number; lng: number };
}

export interface HtmlMetadata {
  title?: string;
  description?: string;
  siteName?: string;
  canonicalUrl?: string;
}

export interface EnrichmentCandidate {
  id: string;
  source: EnrichmentSource;
  confidence: number;
  name?: string;
  category?: string;
  location?: string;
  address?: string;
  url: string;
  googlePlaceId?: string;
  googleMapsUrl?: string;
  sourceLabel: string;
  reason: string;
  raw?: unknown;
}

export interface EnrichmentResult {
  inputUrl: string;
  normalizedUrl: string;
  expandedUrl?: string;
  query?: string;
  candidates: EnrichmentCandidate[];
  selectedCandidate?: EnrichmentCandidate;
  warnings: string[];
}

export interface RestaurantPageInput {
  inputUrl: string;
  candidate: EnrichmentCandidate;
  status?: string;
  review?: string;
}

export interface RuntimeConfig {
  notionToken?: string;
  notionDataSourceId?: string;
  googleMapsApiKey?: string;
  notionWebhookVerificationToken?: string;
  cronSecret?: string;
  defaultRegionCode: string;
  defaultLanguage: string;
  autoWriteThreshold: number;
  appPassword?: string;
  enableAiClassifier: boolean;
}
