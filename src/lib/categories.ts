import type { SelectOption } from "./types";

const CATEGORY_ALIASES: Array<{ category: string; patterns: RegExp[] }> = [
  {
    category: "ラーメン",
    patterns: [/ラーメン/, /らーめん/, /拉麺/, /ramen/i, /noodle/i]
  },
  {
    category: "担々麺",
    patterns: [/担々麺/, /担担麺/, /tantan/i, /dan dan/i]
  },
  {
    category: "辛味噌ラーメン",
    patterns: [/辛味噌/, /辛みそ/]
  },
  {
    category: "カレー",
    patterns: [/カレー/, /curry/i, /スパイス/]
  },
  {
    category: "スイーツ",
    patterns: [/スイーツ/, /ケーキ/, /ドーナツ/, /ドーナッツ/, /クレープ/, /カフェ/, /cafe/i, /dessert/i]
  },
  {
    category: "焼肉",
    patterns: [/焼肉/, /焼き肉/, /yakiniku/i, /bbq/i]
  },
  {
    category: "中華",
    patterns: [/中華/, /中国料理/, /餃子/, /麻婆/, /四川/, /chinese/i]
  },
  {
    category: "和食",
    patterns: [/和食/, /寿司/, /鮨/, /そば/, /蕎麦/, /天ぷら/, /定食/, /japanese/i]
  },
  {
    category: "ジンギスカン",
    patterns: [/ジンギスカン/, /羊肉/, /lamb/i]
  },
  {
    category: "パン",
    patterns: [/パン/, /ベーカリー/, /bakery/i, /bread/i]
  }
];

const GOOGLE_TYPE_TO_CATEGORY: Record<string, string> = {
  bakery: "パン",
  barbecue_restaurant: "焼肉",
  cafe: "スイーツ",
  chinese_restaurant: "中華",
  dessert_restaurant: "スイーツ",
  japanese_restaurant: "和食",
  ramen_restaurant: "ラーメン",
  restaurant: "和食",
  steak_house: "焼肉"
};

export function inferCategoryFromText(...values: Array<string | undefined>): string | undefined {
  const text = values.filter(Boolean).join(" ");
  if (!text) {
    return undefined;
  }

  for (const alias of CATEGORY_ALIASES) {
    if (alias.patterns.some((pattern) => pattern.test(text))) {
      return alias.category;
    }
  }

  return undefined;
}

export function inferCategoryFromGoogleTypes(types: string[] = [], displayName?: string): string | undefined {
  const direct = types.map((type) => GOOGLE_TYPE_TO_CATEGORY[type]).find(Boolean);
  return direct || inferCategoryFromText(displayName, ...types);
}

export function matchExistingCategory(
  desiredCategory: string | undefined,
  options: SelectOption[]
): string | undefined {
  if (!desiredCategory) {
    return undefined;
  }

  const exact = options.find((option) => option.name === desiredCategory);
  if (exact) {
    return exact.name;
  }

  const normalizedDesired = normalizeCategory(desiredCategory);
  const close = options.find((option) => normalizeCategory(option.name) === normalizedDesired);
  return close?.name;
}

export function categoryOptionsFromSchema(schemaOptions: SelectOption[] | undefined): SelectOption[] {
  return schemaOptions || [];
}

function normalizeCategory(value: string): string {
  return value.toLowerCase().replace(/[ー\-_\s]/g, "");
}
