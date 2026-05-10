import { describe, expect, it, vi } from "vitest";
import { expandUrl, normalizeUrl, parseGoogleMapsUrl } from "./url";

describe("url utilities", () => {
  it("normalizes user input into a URL", () => {
    expect(normalizeUrl("maps.app.goo.gl/example#fragment")).toBe("https://maps.app.goo.gl/example");
  });

  it("parses google maps search URLs", () => {
    const parsed = parseGoogleMapsUrl(
      "https://www.google.com/maps/search/?api=1&query=%E3%82%AB%E3%83%AC%E3%83%BC%20%E4%BA%94%E5%8F%8D%E7%94%B0&query_place_id=ChIJ123"
    );

    expect(parsed).toMatchObject({
      isGoogleMapsUrl: true,
      query: "カレー 五反田",
      placeId: "ChIJ123"
    });
  });

  it("parses place names from google maps place paths", () => {
    const parsed = parseGoogleMapsUrl("https://www.google.com/maps/place/%E9%AC%BC%E9%87%91%E6%A3%92/@35.6,139.7,17z");

    expect(parsed.query).toBe("鬼金棒");
    expect(parsed.coordinates).toEqual({ lat: 35.6, lng: 139.7 });
  });

  it("expands redirect chains", async () => {
    const fetcher = vi.fn(async (url: string | URL | Request) => {
      const value = String(url);
      if (value.includes("short")) {
        return new Response(null, {
          status: 302,
          headers: { location: "https://example.com/final" }
        });
      }

      return new Response(null, { status: 200 });
    }) as unknown as typeof fetch;

    await expect(expandUrl("https://maps.app.goo.gl/short", fetcher)).resolves.toBe(
      "https://example.com/final"
    );
  });
});
