import { buildSearchQueryFromMetadata, fetchHtmlMetadata } from "./htmlMetadata";
import { fetchPlaceDetailsCandidate, searchGooglePlaceCandidates } from "./googlePlaces";
import { hostnameLabel, normalizeUrl, parseGoogleMapsUrl, expandUrl, isLikelyShortUrl } from "./url";
import { inferAreaFromAddress } from "./location";
import { inferCategoryFromText } from "./categories";
import type { EnrichmentCandidate, EnrichmentResult, RuntimeConfig } from "./types";

export async function enrichUrl(inputUrl: string, config: RuntimeConfig): Promise<EnrichmentResult> {
  const warnings: string[] = [];
  const normalizedUrl = normalizeUrl(inputUrl);
  let expandedUrl = normalizedUrl;

  if (isLikelyShortUrl(normalizedUrl)) {
    try {
      expandedUrl = await expandUrl(normalizedUrl);
    } catch (error) {
      warnings.push(`短縮URLを展開できませんでした: ${errorMessage(error)}`);
    }
  }

  const parsedGoogleMaps = parseGoogleMapsUrl(expandedUrl);
  const candidates: EnrichmentCandidate[] = [];

  if (parsedGoogleMaps.query || parsedGoogleMaps.placeId || parsedGoogleMaps.coordinates) {
    candidates.push({
      id: "url:google-maps",
      source: "url_parser",
      confidence: parsedGoogleMaps.placeId ? 0.62 : 0.42,
      name: parsedGoogleMaps.query,
      location: parsedGoogleMaps.query ? inferAreaFromAddress(parsedGoogleMaps.query) : undefined,
      category: inferCategoryFromText(parsedGoogleMaps.query),
      url: normalizedUrl,
      googlePlaceId: parsedGoogleMaps.placeId,
      googleMapsUrl: expandedUrl,
      sourceLabel: "URL解析",
      reason: "Google Maps URLから候補を抽出",
      raw: parsedGoogleMaps
    });
  }

  let metadataQuery: string | undefined;
  if (!parsedGoogleMaps.isGoogleMapsUrl) {
    try {
      const metadata = await fetchHtmlMetadata(expandedUrl);
      metadataQuery = buildSearchQueryFromMetadata(metadata, expandedUrl);

      if (metadata.title || metadata.siteName) {
        candidates.push({
          id: "html:metadata",
          source: "html_metadata",
          confidence: 0.48,
          name: metadataQuery,
          category: inferCategoryFromText(metadata.title, metadata.description, metadata.siteName),
          location: inferAreaFromAddress(metadata.title, metadata.description),
          url: metadata.canonicalUrl || normalizedUrl,
          sourceLabel: "HTML/OGP",
          reason: `${hostnameLabel(expandedUrl)} のメタデータから抽出`,
          raw: metadata
        });
      }
    } catch (error) {
      warnings.push(`URL先のHTMLメタデータを取得できませんでした: ${errorMessage(error)}`);
    }
  }

  const googleQuery = parsedGoogleMaps.query || metadataQuery;
  if (config.googleMapsApiKey) {
    try {
      if (parsedGoogleMaps.placeId) {
        const placeCandidate = await fetchPlaceDetailsCandidate(parsedGoogleMaps.placeId, normalizedUrl, {
          apiKey: config.googleMapsApiKey,
          languageCode: config.defaultLanguage,
          regionCode: config.defaultRegionCode
        });

        if (placeCandidate) {
          candidates.push(placeCandidate);
        }
      } else if (googleQuery) {
        candidates.push(
          ...(await searchGooglePlaceCandidates(googleQuery, normalizedUrl, {
            apiKey: config.googleMapsApiKey,
            languageCode: config.defaultLanguage,
            regionCode: config.defaultRegionCode
          }))
        );
      }
    } catch (error) {
      warnings.push(`Google Placesから取得できませんでした: ${errorMessage(error)}`);
    }
  } else {
    warnings.push("GOOGLE_MAPS_API_KEY が未設定のため、Google Places候補は取得していません。");
  }

  if (config.enableAiClassifier) {
    warnings.push("AI分類はfeature flagのみ実装済みです。分類候補は既存provider結果から算出しています。");
  }

  const sortedCandidates = dedupeCandidates(candidates).sort((a, b) => b.confidence - a.confidence);

  return {
    inputUrl,
    normalizedUrl,
    expandedUrl: expandedUrl === normalizedUrl ? undefined : expandedUrl,
    query: googleQuery,
    candidates: sortedCandidates,
    selectedCandidate: sortedCandidates[0],
    warnings
  };
}

export function dedupeCandidates(candidates: EnrichmentCandidate[]): EnrichmentCandidate[] {
  const seen = new Map<string, EnrichmentCandidate>();

  for (const candidate of candidates) {
    const key =
      candidate.googlePlaceId ||
      `${candidate.name || ""}:${candidate.address || ""}:${candidate.source}`.toLowerCase();
    const existing = seen.get(key);

    if (!existing || candidate.confidence > existing.confidence) {
      seen.set(key, candidate);
    }
  }

  return [...seen.values()];
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
