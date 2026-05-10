import type { SelectOption } from "./types";

const CATEGORY_ALIASES: Array<{ category: string; patterns: RegExp[] }> = [
  {
    category: "辛味噌ラーメン",
    patterns: [/辛味噌/, /辛みそ/, /からみそ/, /spicy\s*miso/i]
  },
  {
    category: "担々麺",
    patterns: [/担々麺/, /担担麺/, /坦々麺/, /坦坦麺/, /タンタン麺/, /tantan/i, /dan dan/i, /dandan/i]
  },
  {
    category: "ラーメン",
    patterns: [/ラーメン/, /らーめん/, /拉麺/, /中華そば/, /つけ麺/, /油そば/, /ramen/i, /noodle/i]
  },
  {
    category: "カレー",
    patterns: [/カレー/, /咖喱/, /curry/i, /スパイス/, /インド料理/, /ネパール料理/]
  },
  {
    category: "スイーツ",
    patterns: [
      /スイーツ/,
      /甘味/,
      /和菓子/,
      /洋菓子/,
      /ケーキ/,
      /パフェ/,
      /プリン/,
      /アイス/,
      /ジェラート/,
      /チョコ/,
      /ドーナツ/,
      /ドーナッツ/,
      /クレープ/,
      /カフェ/,
      /喫茶/,
      /cafe/i,
      /dessert/i,
      /sweets?/i,
      /patisserie/i
    ]
  },
  {
    category: "焼肉",
    patterns: [/焼肉/, /焼き肉/, /ホルモン/, /牛タン/, /yakiniku/i, /bbq/i, /barbecue/i, /grill/i]
  },
  {
    category: "中華",
    patterns: [/中華/, /中国料理/, /上海料理/, /広東料理/, /四川/, /麻婆/, /餃子/, /小籠包/, /点心/, /火鍋/, /町中華/, /chinese/i]
  },
  {
    category: "お寿司",
    patterns: [/寿司/, /鮨/, /すし/, /海鮮丼/, /sushi/i]
  },
  {
    category: "和食",
    patterns: [/和食/, /日本料理/, /割烹/, /懐石/, /会席/, /天ぷら/, /天麩羅/, /とんかつ/, /蕎麦/, /そば/, /うどん/, /定食/, /丼/, /japanese/i]
  },
  {
    category: "ジンギスカン",
    patterns: [/ジンギスカン/, /成吉思汗/, /羊肉/, /ラム肉/, /lamb/i, /mutton/i]
  },
  {
    category: "パスタ",
    patterns: [/パスタ/, /スパゲッティ/, /スパゲティ/, /イタリアン/, /イタリア料理/, /pasta/i, /italian/i, /spaghetti/i]
  },
  {
    category: "パン",
    patterns: [/パン/, /ベーカリー/, /ブーランジェリー/, /bakery/i, /bread/i, /boulanger/i]
  },
  {
    category: "鍋",
    patterns: [/鍋/, /もつ鍋/, /水炊き/, /しゃぶしゃぶ/, /すき焼き/, /ちゃんこ/, /hot\s*pot/i, /shabu/i, /sukiyaki/i]
  },
  {
    category: "居酒屋",
    patterns: [/居酒屋/, /酒場/, /炉端/, /焼鳥/, /焼き鳥/, /串焼/, /串カツ/, /立ち飲み/, /バル/, /izakaya/i, /bar/i, /pub/i, /yakitori/i]
  },
  {
    category: "オムライス",
    patterns: [/オムライス/, /オムレツライス/, /洋食/, /omelet/i, /omelette/i, /omurice/i]
  }
];

const GOOGLE_TYPE_TO_CATEGORY: Record<string, string> = {
  bar: "居酒屋",
  bakery: "パン",
  barbecue_restaurant: "焼肉",
  cafe: "スイーツ",
  chinese_restaurant: "中華",
  dessert_restaurant: "スイーツ",
  ice_cream_shop: "スイーツ",
  indian_restaurant: "カレー",
  indonesian_restaurant: "カレー",
  italian_restaurant: "パスタ",
  japanese_restaurant: "和食",
  meal_takeaway: "居酒屋",
  pizza_restaurant: "パスタ",
  pub: "居酒屋",
  ramen_restaurant: "ラーメン",
  seafood_restaurant: "お寿司",
  steak_house: "焼肉",
  sushi_restaurant: "お寿司"
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
  return direct || inferCategoryFromText(displayName);
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
