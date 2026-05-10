import { describe, expect, it } from "vitest";
import {
  buildCreateProperties,
  buildUpdateProperties,
  isPageAlreadyHandled,
  RESTAURANT_PROPERTIES
} from "./notionProperties";
import type { EnrichmentCandidate, NotionPropertySchema } from "./types";

const schema: Record<string, NotionPropertySchema> = {
  [RESTAURANT_PROPERTIES.name]: { id: "title", name: RESTAURANT_PROPERTIES.name, type: "title" },
  [RESTAURANT_PROPERTIES.status]: { id: "status", name: RESTAURANT_PROPERTIES.status, type: "status" },
  [RESTAURANT_PROPERTIES.category]: {
    id: "cat",
    name: RESTAURANT_PROPERTIES.category,
    type: "multi_select",
    multi_select: { options: [{ name: "カレー" }, { name: "ラーメン" }] }
  },
  [RESTAURANT_PROPERTIES.location]: { id: "loc", name: RESTAURANT_PROPERTIES.location, type: "rich_text" },
  [RESTAURANT_PROPERTIES.url]: { id: "url", name: RESTAURANT_PROPERTIES.url, type: "url" },
  [RESTAURANT_PROPERTIES.enrichmentStatus]: {
    id: "enrich",
    name: RESTAURANT_PROPERTIES.enrichmentStatus,
    type: "select"
  }
};

const candidate: EnrichmentCandidate = {
  id: "google:1",
  source: "google_places",
  sourceLabel: "Google Places",
  confidence: 0.91,
  name: "ステーキライスとカレーの店",
  category: "カレー",
  location: "五反田",
  url: "https://maps.example",
  reason: "test"
};

describe("notion property builder", () => {
  it("sets default status and high-confidence category on create", () => {
    const properties = buildCreateProperties(schema, {
      url: "https://maps.example",
      candidate,
      autoWriteThreshold: 0.8
    });

    expect(properties[RESTAURANT_PROPERTIES.status]).toEqual({ status: { name: "未達" } });
    expect(properties[RESTAURANT_PROPERTIES.category]).toEqual({
      multi_select: [{ name: "カレー" }]
    });
  });

  it("does not overwrite low-confidence category on update", () => {
    const properties = buildUpdateProperties(
      schema,
      {
        [RESTAURANT_PROPERTIES.url]: { type: "url", url: "https://maps.example" }
      },
      {
        url: "https://maps.example",
        candidate: { ...candidate, confidence: 0.5 },
        autoWriteThreshold: 0.8
      }
    );

    expect(properties[RESTAURANT_PROPERTIES.category]).toBeUndefined();
  });

  it("treats complete and candidate statuses as already handled", () => {
    expect(
      isPageAlreadyHandled({
        [RESTAURANT_PROPERTIES.enrichmentStatus]: { type: "select", select: { name: "補完済" } }
      })
    ).toBe(true);

    expect(
      isPageAlreadyHandled({
        [RESTAURANT_PROPERTIES.enrichmentStatus]: {
          type: "select",
          select: { name: "補完候補あり" }
        }
      })
    ).toBe(true);
  });
});
