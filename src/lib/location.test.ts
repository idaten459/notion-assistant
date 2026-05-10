import { describe, expect, it } from "vitest";
import { extractShortAddressArea, inferAreaFromAddress } from "./location";

describe("location inference", () => {
  it("uses known area keywords first", () => {
    expect(inferAreaFromAddress("東京都品川区東五反田1-1-1")).toBe("五反田");
  });

  it("falls back to ward-level defaults", () => {
    expect(inferAreaFromAddress("東京都豊島区南池袋1-1-1")).toBe("池袋");
  });

  it("extracts a short readable address token", () => {
    expect(extractShortAddressArea("神奈川県鎌倉市小町2-1-1")).toBe("鎌倉市");
  });
});
