import { describe, expect, it } from "vitest";
import { inferCategoryFromGoogleTypes, inferCategoryFromText, matchExistingCategory } from "./categories";

describe("category mapping", () => {
  it("infers categories from text", () => {
    expect(inferCategoryFromText("月島のインドカレー")).toBe("カレー");
    expect(inferCategoryFromText("ミルキードーナッツ")).toBe("スイーツ");
  });

  it("infers categories from google place types", () => {
    expect(inferCategoryFromGoogleTypes(["ramen_restaurant"])).toBe("ラーメン");
    expect(inferCategoryFromGoogleTypes(["bakery"])).toBe("パン");
  });

  it("only returns existing notion category options", () => {
    expect(matchExistingCategory("カレー", [{ name: "カレー" }])).toBe("カレー");
    expect(matchExistingCategory("ジンギスカン", [{ name: "焼肉" }])).toBeUndefined();
  });
});
