import { describe, expect, it } from "vitest";
import { inferCategoryFromGoogleTypes, inferCategoryFromText, matchExistingCategory } from "./categories";

describe("category mapping", () => {
  const existingOptions = [
    "中華",
    "お寿司",
    "スイーツ",
    "ラーメン",
    "ジンギスカン",
    "パスタ",
    "辛味噌ラーメン",
    "担々麺",
    "カレー",
    "和食",
    "焼肉",
    "鍋",
    "居酒屋",
    "パン",
    "オムライス"
  ].map((name) => ({ name }));

  it("infers categories from text", () => {
    expect(inferCategoryFromText("月島のインドカレー")).toBe("カレー");
    expect(inferCategoryFromText("ミルキードーナッツ")).toBe("スイーツ");
  });

  it("covers all current Notion category options with text hints", () => {
    const examples: Record<string, string> = {
      中華: "四川麻婆豆腐と餃子の中華料理",
      お寿司: "銀座の鮨と寿司",
      スイーツ: "クレープとケーキのカフェ",
      ラーメン: "神田のラーメン",
      ジンギスカン: "羊肉ジンギスカン",
      パスタ: "イタリアン パスタ",
      辛味噌ラーメン: "辛味噌らーめん",
      担々麺: "汁なし担々麺",
      カレー: "スパイスカレー",
      和食: "天ぷら定食の和食店",
      焼肉: "黒毛和牛の焼肉",
      鍋: "もつ鍋と水炊き",
      居酒屋: "焼鳥居酒屋",
      パン: "ベーカリーのパン",
      オムライス: "洋食オムライス"
    };

    for (const [category, text] of Object.entries(examples)) {
      expect(inferCategoryFromText(text), text).toBe(category);
      expect(matchExistingCategory(category, existingOptions), category).toBe(category);
    }
  });

  it("infers categories from google place types", () => {
    expect(inferCategoryFromGoogleTypes(["ramen_restaurant"])).toBe("ラーメン");
    expect(inferCategoryFromGoogleTypes(["bakery"])).toBe("パン");
    expect(inferCategoryFromGoogleTypes(["sushi_restaurant"])).toBe("お寿司");
    expect(inferCategoryFromGoogleTypes(["italian_restaurant"])).toBe("パスタ");
    expect(inferCategoryFromGoogleTypes(["restaurant"], "銀座の寿司")).toBe("お寿司");
    expect(inferCategoryFromGoogleTypes(["restaurant"])).toBeUndefined();
  });

  it("only returns existing notion category options", () => {
    expect(matchExistingCategory("カレー", [{ name: "カレー" }])).toBe("カレー");
    expect(matchExistingCategory("ジンギスカン", [{ name: "焼肉" }])).toBeUndefined();
  });
});
