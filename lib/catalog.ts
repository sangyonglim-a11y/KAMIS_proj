export type Category = "veg" | "meat";

export type MeatGroup =
  | "imported_beef"
  | "imported_pork"
  | "domestic_beef"
  | "domestic_pork";

export type ItemDef = {
  id: string;
  name: string;
  category: Category;
  aliases: string[];
  unit: string;
  note?: string;
  /** veg KAMIS codes */
  categoryCode?: string;
  itemCode?: string;
  kindCode?: string | null;
  kindName?: string;
  gradeCode?: string;
  /** meat */
  meatGroup?: MeatGroup;
  origin?: string;
  brand?: string;
  part?: string;
  searchKeyword?: string;
};

export const MEAT_GROUP_LABEL: Record<MeatGroup, string> = {
  imported_beef: "수입 소고기",
  imported_pork: "수입 돼지고기",
  domestic_beef: "국산 소고기",
  domestic_pork: "국산 돼지고기",
};

export const VEG_ITEMS: ItemDef[] = [
  {
    id: "sangchu",
    name: "상추",
    category: "veg",
    aliases: ["상추", "청상추"],
    categoryCode: "200",
    itemCode: "214",
    kindCode: "02",
    kindName: "청",
    unit: "4kg",
    gradeCode: "04",
  },
  {
    id: "kkaetnip",
    name: "깻잎",
    category: "veg",
    aliases: ["깻잎"],
    categoryCode: "200",
    itemCode: "253",
    kindCode: "00",
    kindName: "깻잎",
    unit: "2kg",
    gradeCode: "04",
  },
  {
    id: "yangpa",
    name: "양파",
    category: "veg",
    aliases: ["양파"],
    categoryCode: "200",
    itemCode: "245",
    kindCode: "00",
    kindName: "양파",
    unit: "15kg",
    gradeCode: "04",
  },
  {
    id: "mu",
    name: "무",
    category: "veg",
    aliases: ["무"],
    categoryCode: "200",
    itemCode: "231",
    kindCode: null,
    kindName: "전체",
    unit: "20kg",
    gradeCode: "04",
  },
  {
    id: "cheongyang",
    name: "청양고추",
    category: "veg",
    aliases: ["청양고추", "청양"],
    categoryCode: "200",
    itemCode: "242",
    kindCode: "03",
    kindName: "청양고추",
    unit: "10kg",
    gradeCode: "04",
  },
  {
    id: "yangbaechu",
    name: "양배추",
    category: "veg",
    aliases: ["양배추"],
    categoryCode: "200",
    itemCode: "212",
    kindCode: "00",
    kindName: "양배추",
    unit: "8kg",
    gradeCode: "04",
  },
  {
    id: "cheongoi",
    name: "청오이",
    category: "veg",
    aliases: ["청오이", "취청"],
    categoryCode: "200",
    itemCode: "223",
    kindCode: "03",
    kindName: "취청",
    unit: "50개",
    gradeCode: "04",
  },
  {
    id: "paengi",
    name: "팽이버섯",
    category: "veg",
    aliases: ["팽이버섯", "팽이"],
    categoryCode: "300",
    itemCode: "316",
    kindCode: "00",
    kindName: "팽이버섯",
    unit: "5kg",
    gradeCode: "04",
  },
  {
    id: "saesongi",
    name: "새송이버섯",
    category: "veg",
    aliases: ["새송이버섯", "새송이"],
    categoryCode: "300",
    itemCode: "317",
    kindCode: "00",
    kindName: "새송이버섯",
    unit: "2kg",
    gradeCode: "04",
  },
  {
    id: "zucchini",
    name: "주키니호박",
    category: "veg",
    aliases: ["주키니호박", "주키니", "쥬키니"],
    categoryCode: "200",
    itemCode: "224",
    kindCode: "02",
    kindName: "쥬키니",
    unit: "10kg",
    gradeCode: "04",
  },
  {
    id: "aehobak",
    name: "애호박",
    category: "veg",
    aliases: ["애호박"],
    categoryCode: "200",
    itemCode: "224",
    kindCode: "01",
    kindName: "애호박",
    unit: "20개",
    gradeCode: "04",
  },
];

/** 초기 추적 육류 10종 */
export const MEAT_ITEMS: ItemDef[] = [
  {
    id: "us-hwangje-galbisal",
    name: "황제소갈비살",
    category: "meat",
    aliases: ["황제소갈비살", "황제 소갈비살"],
    meatGroup: "imported_beef",
    origin: "미국산",
    brand: "",
    part: "황제소갈비살",
    unit: "kg",
    searchKeyword: "황제소갈비살 미국",
  },
  {
    id: "us-neukgansal",
    name: "늑간살(수입소)",
    category: "meat",
    aliases: ["늑간살", "미국 늑간살"],
    meatGroup: "imported_beef",
    origin: "미국산",
    brand: "",
    part: "늑간살",
    unit: "kg",
    searchKeyword: "늑간살 미국 소",
  },
  {
    id: "us-almoksim",
    name: "알목심",
    category: "meat",
    aliases: ["알목심"],
    meatGroup: "imported_beef",
    origin: "미국산",
    brand: "",
    part: "알목심",
    unit: "kg",
    searchKeyword: "알목심 미국",
  },
  {
    id: "us-salchisal",
    name: "살치살",
    category: "meat",
    aliases: ["살치살"],
    meatGroup: "imported_beef",
    origin: "미국산",
    brand: "",
    part: "살치살",
    unit: "kg",
    searchKeyword: "살치살 미국",
  },
  {
    id: "iberico-moksal",
    name: "이베리코 흑돼지 목살",
    category: "meat",
    aliases: ["이베리코 목살", "이베리코흑돼지목살"],
    meatGroup: "imported_pork",
    origin: "스페인",
    brand: "이베리코",
    part: "목살",
    unit: "kg",
    searchKeyword: "이베리코 목살",
  },
  {
    id: "iberico-neukgan",
    name: "이베리코 흑돼지 늑간살",
    category: "meat",
    aliases: ["이베리코 늑간살"],
    meatGroup: "imported_pork",
    origin: "스페인",
    brand: "이베리코",
    part: "늑간살",
    unit: "kg",
    searchKeyword: "이베리코 늑간살",
  },
  {
    id: "iberico-hangjeong",
    name: "이베리코 흑돼지 항정살",
    category: "meat",
    aliases: ["이베리코 항정살"],
    meatGroup: "imported_pork",
    origin: "스페인",
    brand: "이베리코",
    part: "항정살",
    unit: "kg",
    searchKeyword: "이베리코 항정살",
  },
  {
    id: "chile-moksal",
    name: "칠레산 목살",
    category: "meat",
    aliases: ["칠레 목살"],
    meatGroup: "imported_pork",
    origin: "칠레산",
    brand: "",
    part: "목살",
    unit: "kg",
    searchKeyword: "칠레 목살",
  },
  {
    id: "chile-samgyeop",
    name: "칠레산 삼겹살",
    category: "meat",
    aliases: ["칠레 삼겹살"],
    meatGroup: "imported_pork",
    origin: "칠레산",
    brand: "",
    part: "삼겹살",
    unit: "kg",
    searchKeyword: "칠레 삼겹살",
  },
  {
    id: "hanwoo-hongdukkae",
    name: "한우/육우 홍두깨살",
    category: "meat",
    aliases: ["홍두깨살", "한우 홍두깨살"],
    meatGroup: "domestic_beef",
    origin: "국산",
    brand: "한우/육우",
    part: "홍두깨살",
    unit: "kg",
    searchKeyword: "홍두깨살 한우",
  },
  {
    id: "kr-samgyeop",
    name: "국내산 삼겹살",
    category: "meat",
    aliases: ["국산 삼겹살", "국내 삼겹살"],
    meatGroup: "domestic_pork",
    origin: "국산",
    brand: "",
    part: "삼겹살",
    unit: "kg",
    searchKeyword: "국내산 삼겹살",
  },
];

export const ALL_ITEMS = [...VEG_ITEMS, ...MEAT_ITEMS];

export const BUY_ACTIONS = [
  "적극 매입",
  "관망",
  "소량 분할 매입",
  "매입 보류",
] as const;

export type BuyAction = (typeof BUY_ACTIONS)[number];

export function itemsByCategory(cat: Category): ItemDef[] {
  return ALL_ITEMS.filter((i) => i.category === cat);
}

export function findItemById(id: string): ItemDef | null {
  return ALL_ITEMS.find((i) => i.id === id) ?? null;
}

export function findItemByName(input: string, category?: Category): ItemDef | null {
  const q = input.trim().toLowerCase();
  if (!q) return null;
  const pool = category ? itemsByCategory(category) : ALL_ITEMS;
  return (
    pool.find(
      (it) =>
        it.name.toLowerCase() === q ||
        it.id === q ||
        it.aliases.some((a) => a.toLowerCase() === q),
    ) ?? null
  );
}

export function slugifyMeatName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9가-힣\-_/]/g, "")
    .slice(0, 48);
}
