import { fetchWithTimeout } from "./http";
import type { HtmlMetadata } from "./types";

const MAX_HTML_BYTES = 300_000;

export async function fetchHtmlMetadata(url: string): Promise<HtmlMetadata> {
  const response = await fetchWithTimeout(url, {
    method: "GET",
    timeoutMs: 8000,
    headers: {
      accept: "text/html,application/xhtml+xml",
      "user-agent": "notion-restaurant-assistant/0.1"
    }
  });

  const contentType = response.headers.get("content-type") || "";
  if (!response.ok || !contentType.includes("text/html")) {
    return {};
  }

  const html = (await response.text()).slice(0, MAX_HTML_BYTES);
  return parseHtmlMetadata(html, url);
}

export function parseHtmlMetadata(html: string, baseUrl: string): HtmlMetadata {
  const title = decodeHtml(readTagContent(html, "title") || readMetaContent(html, "og:title"));
  const description = decodeHtml(
    readMetaContent(html, "description") || readMetaContent(html, "og:description")
  );
  const siteName = decodeHtml(readMetaContent(html, "og:site_name"));
  const canonicalHref = readLinkHref(html, "canonical");

  return {
    title: cleanupTitle(title),
    description: cleanupText(description),
    siteName: cleanupText(siteName),
    canonicalUrl: canonicalHref ? new URL(canonicalHref, baseUrl).toString() : undefined
  };
}

export function buildSearchQueryFromMetadata(metadata: HtmlMetadata, fallbackUrl: string): string | undefined {
  const title = metadata.title?.trim();
  if (title) {
    return stripKnownSiteSuffix(title);
  }

  const siteName = metadata.siteName?.trim();
  if (siteName) {
    return siteName;
  }

  try {
    return new URL(fallbackUrl).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

function readTagContent(html: string, tagName: string): string | undefined {
  const match = html.match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i"));
  return match?.[1];
}

function readMetaContent(html: string, name: string): string | undefined {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `<meta\\s+[^>]*(?:property|name)=["']${escaped}["'][^>]*content=["']([^"']+)["'][^>]*>|` +
      `<meta\\s+[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["']${escaped}["'][^>]*>`,
    "i"
  );
  const match = html.match(pattern);
  return match?.[1] || match?.[2];
}

function readLinkHref(html: string, rel: string): string | undefined {
  const escaped = rel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `<link\\s+[^>]*rel=["'][^"']*${escaped}[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>|` +
      `<link\\s+[^>]*href=["']([^"']+)["'][^>]*rel=["'][^"']*${escaped}[^"']*["'][^>]*>`,
    "i"
  );
  const match = html.match(pattern);
  return match?.[1] || match?.[2];
}

function decodeHtml(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function cleanupTitle(title: string | undefined): string | undefined {
  return cleanupText(title ? stripKnownSiteSuffix(title) : undefined);
}

function cleanupText(value: string | undefined): string | undefined {
  const cleaned = value?.replace(/\s+/g, " ").trim();
  return cleaned || undefined;
}

function stripKnownSiteSuffix(title: string): string {
  return title
    .replace(/\s*[｜|]\s*食べログ\s*$/i, "")
    .replace(/\s*[｜|]\s*Retty.*$/i, "")
    .replace(/\s*[｜|]\s*ホットペッパーグルメ.*$/i, "")
    .replace(/\s*-\s*Google\s*(検索|Search)?\s*$/i, "")
    .replace(/\s*-\s*Google\s*Maps\s*$/i, "")
    .trim();
}
