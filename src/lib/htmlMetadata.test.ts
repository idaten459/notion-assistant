import { describe, expect, it } from "vitest";
import { buildSearchQueryFromMetadata, parseHtmlMetadata } from "./htmlMetadata";

describe("html metadata", () => {
  it("extracts useful metadata", () => {
    const metadata = parseHtmlMetadata(
      `
      <html>
        <head>
          <title>ステーキライスとカレーの店 | 食べログ</title>
          <meta property="og:description" content="五反田の人気店">
          <link rel="canonical" href="/restaurant/1">
        </head>
      </html>
      `,
      "https://example.com/listing"
    );

    expect(metadata).toEqual({
      title: "ステーキライスとカレーの店",
      description: "五反田の人気店",
      siteName: undefined,
      canonicalUrl: "https://example.com/restaurant/1"
    });
  });

  it("builds a places search query from metadata", () => {
    expect(
      buildSearchQueryFromMetadata({ title: "ペニーレイン | 食べログ" }, "https://example.com")
    ).toBe("ペニーレイン");
  });
});
