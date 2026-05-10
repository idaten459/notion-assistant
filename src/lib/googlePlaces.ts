import { inferCategoryFromGoogleTypes } from "./categories";
import { fetchWithTimeout } from "./http";
import { inferAreaFromAddress } from "./location";
import type { EnrichmentCandidate } from "./types";

const PLACE_DETAILS_FIELD_MASK = [
  "id",
  "displayName",
  "formattedAddress",
  "shortFormattedAddress",
  "types",
  "primaryType",
  "primaryTypeDisplayName",
  "googleMapsUri"
].join(",");

const TEXT_SEARCH_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.shortFormattedAddress",
  "places.types",
  "places.primaryType",
  "places.primaryTypeDisplayName",
  "places.googleMapsUri"
].join(",");

interface GoogleDisplayName {
  text?: string;
  languageCode?: string;
}

interface GooglePlace {
  id?: string;
  displayName?: GoogleDisplayName;
  formattedAddress?: string;
  shortFormattedAddress?: string;
  types?: string[];
  primaryType?: string;
  primaryTypeDisplayName?: GoogleDisplayName;
  googleMapsUri?: string;
}

interface GooglePlacesOptions {
  apiKey: string;
  languageCode: string;
  regionCode: string;
}

export async function fetchPlaceDetailsCandidate(
  placeId: string,
  url: string,
  options: GooglePlacesOptions
): Promise<EnrichmentCandidate | undefined> {
  const endpoint = new URL(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`);
  endpoint.searchParams.set("languageCode", options.languageCode);
  endpoint.searchParams.set("regionCode", options.regionCode);

  const response = await fetchWithTimeout(endpoint, {
    method: "GET",
    timeoutMs: 8000,
    headers: {
      "X-Goog-Api-Key": options.apiKey,
      "X-Goog-FieldMask": PLACE_DETAILS_FIELD_MASK
    }
  });

  if (!response.ok) {
    throw new Error(`Google Place Details failed: ${response.status}`);
  }

  const place = (await response.json()) as GooglePlace;
  return googlePlaceToCandidate(place, url, 0.94, "Place IDから取得");
}

export async function searchGooglePlaceCandidates(
  query: string,
  url: string,
  options: GooglePlacesOptions
): Promise<EnrichmentCandidate[]> {
  const response = await fetchWithTimeout("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    timeoutMs: 8000,
    headers: {
      "content-type": "application/json",
      "X-Goog-Api-Key": options.apiKey,
      "X-Goog-FieldMask": TEXT_SEARCH_FIELD_MASK
    },
    body: JSON.stringify({
      textQuery: query,
      languageCode: options.languageCode,
      regionCode: options.regionCode,
      includedType: "restaurant"
    })
  });

  if (!response.ok) {
    throw new Error(`Google Text Search failed: ${response.status}`);
  }

  const body = (await response.json()) as { places?: GooglePlace[] };
  return (body.places || [])
    .slice(0, 3)
    .map((place, index) =>
      googlePlaceToCandidate(
        place,
        url,
        index === 0 ? 0.88 : 0.72,
        index === 0 ? "検索結果の最上位候補" : "検索結果の代替候補"
      )
    )
    .filter((candidate): candidate is EnrichmentCandidate => Boolean(candidate));
}

function googlePlaceToCandidate(
  place: GooglePlace,
  url: string,
  confidence: number,
  reason: string
): EnrichmentCandidate | undefined {
  const name = place.displayName?.text;
  if (!name) {
    return undefined;
  }

  const types = [place.primaryType, ...(place.types || [])].filter(Boolean) as string[];
  const category =
    inferCategoryFromGoogleTypes(types, place.primaryTypeDisplayName?.text) ||
    inferCategoryFromGoogleTypes(types, name);
  const address = place.shortFormattedAddress || place.formattedAddress;
  const location = inferAreaFromAddress(address, name);

  return {
    id: `google:${place.id || name}`,
    source: "google_places",
    confidence,
    name,
    category,
    location,
    address,
    url,
    googlePlaceId: place.id,
    googleMapsUrl: place.googleMapsUri,
    sourceLabel: "Google Places",
    reason,
    raw: place
  };
}
