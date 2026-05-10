import { afterEach, describe, expect, it, vi } from "vitest";
import { createRestaurantPage, syncPageById } from "./notion";
import { RESTAURANT_PROPERTIES } from "./notionProperties";
import type { EnrichmentCandidate, RuntimeConfig } from "./types";

const config: RuntimeConfig = {
  notionToken: "notion-token",
  notionDataSourceId: "data-source-id",
  googleMapsApiKey: "google-key",
  notionWebhookVerificationToken: "webhook-token",
  cronSecret: "cron-secret",
  defaultRegionCode: "JP",
  defaultLanguage: "ja",
  autoWriteThreshold: 0.8,
  enableAiClassifier: false
};

const dataSource = {
  object: "data_source",
  id: "data-source-id",
  properties: {
    [RESTAURANT_PROPERTIES.name]: { id: "title", name: RESTAURANT_PROPERTIES.name, type: "title" },
    [RESTAURANT_PROPERTIES.status]: { id: "status", name: RESTAURANT_PROPERTIES.status, type: "status" },
    [RESTAURANT_PROPERTIES.category]: {
      id: "cat",
      name: RESTAURANT_PROPERTIES.category,
      type: "multi_select",
      multi_select: { options: [{ name: "カレー" }] }
    },
    [RESTAURANT_PROPERTIES.location]: { id: "loc", name: RESTAURANT_PROPERTIES.location, type: "rich_text" },
    [RESTAURANT_PROPERTIES.url]: { id: "url", name: RESTAURANT_PROPERTIES.url, type: "url" },
    [RESTAURANT_PROPERTIES.enrichmentStatus]: {
      id: "enrich",
      name: RESTAURANT_PROPERTIES.enrichmentStatus,
      type: "select"
    }
  }
};

const candidate: EnrichmentCandidate = {
  id: "google:1",
  source: "google_places",
  sourceLabel: "Google Places",
  confidence: 0.91,
  name: "カレー屋",
  category: "カレー",
  location: "五反田",
  url: "https://example.com",
  reason: "test"
};

describe("notion integration", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("creates a Notion page using a data source parent", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(dataSource))
      .mockResolvedValueOnce(jsonResponse({ object: "page", id: "page-id", properties: {} }));
    vi.stubGlobal("fetch", fetchMock);

    const page = await createRestaurantPage(config, {
      inputUrl: "https://example.com",
      candidate
    });

    expect(page.id).toBe("page-id");
    expect(fetchMock).toHaveBeenLastCalledWith(
      "https://api.notion.com/v1/pages",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"data_source_id":"data-source-id"')
      })
    );
  });

  it("syncs an existing page by enriching its URL", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);

      if (url.includes("/v1/pages/page-id") && init?.method === "GET") {
        return jsonResponse({
          object: "page",
          id: "page-id",
          properties: {
            [RESTAURANT_PROPERTIES.url]: {
              type: "url",
              url: "https://www.google.com/maps/search/?api=1&query=%E3%82%AB%E3%83%AC%E3%83%BC%20%E4%BA%94%E5%8F%8D%E7%94%B0"
            }
          }
        });
      }

      if (url.includes("places:searchText")) {
        return jsonResponse({
          places: [
            {
              id: "place-id",
              displayName: { text: "カレー屋" },
              shortFormattedAddress: "東京都品川区東五反田",
              types: ["restaurant"],
              primaryType: "restaurant",
              googleMapsUri: "https://maps.google.com/?cid=1"
            }
          ]
        });
      }

      if (url.includes("/v1/data_sources/data-source-id")) {
        return jsonResponse(dataSource);
      }

      if (url.includes("/v1/pages/page-id") && init?.method === "PATCH") {
        return jsonResponse({ object: "page", id: "page-id", properties: {} });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await syncPageById(config, "page-id");

    expect(result.candidate?.name).toBe("カレー屋");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.notion.com/v1/pages/page-id",
      expect.objectContaining({ method: "PATCH" })
    );
  });
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}
