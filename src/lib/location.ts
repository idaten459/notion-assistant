const AREA_KEYWORDS = [
  "池袋",
  "五反田",
  "神田",
  "新橋",
  "新宿",
  "宇都宮",
  "お台場",
  "台場",
  "月島",
  "青山",
  "恵比寿",
  "有楽町",
  "那須",
  "本郷三丁目",
  "本郷",
  "神楽坂",
  "池尻",
  "銀座",
  "渋谷",
  "原宿",
  "表参道",
  "赤坂",
  "六本木",
  "麻布十番",
  "上野",
  "浅草",
  "秋葉原",
  "中目黒",
  "代官山",
  "下北沢",
  "吉祥寺",
  "中野",
  "高円寺",
  "品川",
  "田町",
  "浜松町",
  "大門",
  "東京",
  "日本橋",
  "三越前",
  "飯田橋",
  "水道橋",
  "御茶ノ水",
  "小前田",
  "秩父"
];

const TOKYO_WARD_TO_AREA: Record<string, string> = {
  千代田区: "東京",
  中央区: "銀座",
  港区: "新橋",
  新宿区: "新宿",
  文京区: "本郷",
  台東区: "上野",
  墨田区: "錦糸町",
  江東区: "豊洲",
  品川区: "品川",
  目黒区: "中目黒",
  大田区: "蒲田",
  世田谷区: "三軒茶屋",
  渋谷区: "渋谷",
  中野区: "中野",
  杉並区: "高円寺",
  豊島区: "池袋"
};

export function inferAreaFromAddress(...values: Array<string | undefined>): string | undefined {
  const text = values.filter(Boolean).join(" ");
  if (!text) {
    return undefined;
  }

  const direct = AREA_KEYWORDS.find((keyword) => text.includes(keyword));
  if (direct) {
    return direct === "台場" ? "お台場" : direct;
  }

  const ward = Object.entries(TOKYO_WARD_TO_AREA).find(([wardName]) => text.includes(wardName));
  if (ward) {
    return ward[1];
  }

  return extractShortAddressArea(text);
}

export function extractShortAddressArea(address: string | undefined): string | undefined {
  if (!address) {
    return undefined;
  }

  const withoutCountry = address.replace(/^日本、?\s*/, "").replace(/^〒\d{3}-?\d{4}\s*/, "");
  const municipality = withoutCountry.match(
    /(?:東京都|大阪府|京都府|北海道|.{2,3}県)?\s*([^0-9\s,、-]+?[市区町村])/
  );
  if (municipality?.[1]) {
    return municipality[1].trim();
  }

  const match = withoutCountry.match(/(?:東京都|大阪府|京都府|北海道|.{2,3}県)?\s*([^市区町村\s]+[市区町村])?\s*([^0-9\s,、-]+)/);
  return match?.[2]?.trim();
}
