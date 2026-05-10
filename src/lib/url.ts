import { fetchWithTimeout } from "./http";
import type { GoogleMapsParseResult } from "./types";

const GOOGLE_MAPS_HOSTS = new Set([
  "google.com",
  "www.google.com",
  "maps.google.com",
  "maps.app.goo.gl",
  "goo.gl"
]);

export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error("URL is empty");
  }

  const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  const url = new URL(withProtocol);
  url.hash = "";
  return url.toString();
}

export function isLikelyShortUrl(url: string): boolean {
  const parsed = new URL(url);
  const host = parsed.hostname.toLowerCase();
  return host === "maps.app.goo.gl" || host === "goo.gl" || host === "bit.ly" || host === "t.co";
}

export async function expandUrl(
  inputUrl: string,
  fetcher: typeof fetch = fetch,
  maxRedirects = 5
): Promise<string> {
  let currentUrl = inputUrl;

  for (let index = 0; index < maxRedirects; index += 1) {
    const response = await fetchRedirectStep(currentUrl, "HEAD", fetcher).catch(() =>
      fetchRedirectStep(currentUrl, "GET", fetcher)
    );

    const location = response.headers.get("location");
    if (!location || response.status < 300 || response.status >= 400) {
      return currentUrl;
    }

    currentUrl = new URL(location, currentUrl).toString();
  }

  return currentUrl;
}

async function fetchRedirectStep(
  url: string,
  method: "GET" | "HEAD",
  fetcher: typeof fetch
): Promise<Response> {
  if (fetcher === fetch) {
    return fetchWithTimeout(url, {
      method,
      redirect: "manual",
      timeoutMs: 5000,
      headers: {
        "user-agent": "notion-restaurant-assistant/0.1"
      }
    });
  }

  return fetcher(url, {
    method,
    redirect: "manual",
    headers: {
      "user-agent": "notion-restaurant-assistant/0.1"
    }
  });
}

export function parseGoogleMapsUrl(url: string): GoogleMapsParseResult {
  const parsed = new URL(url);
  const host = parsed.hostname.toLowerCase();
  const normalizedHost = host.startsWith("www.") ? host.slice(4) : host;
  const isGoogleMapsUrl =
    GOOGLE_MAPS_HOSTS.has(host) ||
    GOOGLE_MAPS_HOSTS.has(normalizedHost) ||
    (normalizedHost === "google.co.jp" && parsed.pathname.startsWith("/maps"));

  if (!isGoogleMapsUrl) {
    return { isGoogleMapsUrl: false };
  }

  const query =
    parsed.searchParams.get("query") ||
    parsed.searchParams.get("q") ||
    parseMapsPlaceName(parsed.pathname);
  const placeId =
    parsed.searchParams.get("query_place_id") ||
    parsed.searchParams.get("place_id") ||
    parsePlaceIdFromDataPath(parsed.pathname + parsed.search);
  const cid = parsed.searchParams.get("cid") || undefined;
  const coordinates = parseCoordinates(parsed.pathname + parsed.search);

  return {
    isGoogleMapsUrl: true,
    placeId: placeId || undefined,
    cid,
    query: cleanGoogleQuery(query),
    coordinates
  };
}

export function hostnameLabel(url: string): string {
  const parsed = new URL(url);
  return parsed.hostname.replace(/^www\./, "");
}

function parseMapsPlaceName(pathname: string): string | undefined {
  const match = pathname.match(/\/maps\/place\/([^/]+)/);
  if (!match) {
    return undefined;
  }

  return decodeURIComponent(match[1].replace(/\+/g, " "));
}

function parsePlaceIdFromDataPath(value: string): string | undefined {
  const explicit = value.match(/(?:place_id:|query_place_id=)(ChI[A-Za-z0-9_-]+)/);
  if (explicit?.[1]) {
    return explicit[1];
  }

  const dataMatch = value.match(/!1s(ChI[A-Za-z0-9_-]+)/);
  return dataMatch?.[1];
}

function parseCoordinates(value: string): { lat: number; lng: number } | undefined {
  const match = value.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (!match) {
    return undefined;
  }

  return {
    lat: Number(match[1]),
    lng: Number(match[2])
  };
}

function cleanGoogleQuery(query: string | undefined | null): string | undefined {
  if (!query) {
    return undefined;
  }

  const cleaned = query
    .replace(/\+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || undefined;
}
