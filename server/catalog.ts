export type ItemDef = {
  id: string;
  name: string;
  aliases: string[];
  categoryCode: string;
  itemCode: string;
  kindCode: string | null;
  kindName: string;
  unit: string;
  gradeCode: string;
  note?: string;
};

/** Presets from internal/kamis-dashboard.md + forecast additions */
export const ITEMS: ItemDef[] = [
  {
    id: "sangchu",
    name: "상추",
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
    aliases: ["무"],
    categoryCode: "200",
    itemCode: "231",
    kindCode: null,
    kindName: "전체",
    unit: "20kg",
    gradeCode: "04",
    note: "품종 전체 시장 단순 평균",
  },
  {
    id: "daepa",
    name: "대파",
    aliases: ["대파", "파"],
    categoryCode: "200",
    itemCode: "246",
    kindCode: "00",
    kindName: "대파",
    unit: "1kg",
    gradeCode: "04",
  },
  {
    id: "maneul",
    name: "마늘",
    aliases: ["마늘", "깐마늘(대서)", "깐마늘"],
    categoryCode: "200",
    itemCode: "258",
    kindCode: "03",
    kindName: "깐마늘(대서)",
    unit: "20kg",
    gradeCode: "04",
  },
  {
    id: "cheongyang",
    name: "청양고추",
    aliases: ["청양고추", "청양"],
    categoryCode: "200",
    itemCode: "242",
    kindCode: "03",
    kindName: "청양고추",
    unit: "10kg",
    gradeCode: "04",
  },
  {
    id: "baechu",
    name: "배추",
    aliases: ["배추", "가을배추"],
    categoryCode: "200",
    itemCode: "211",
    kindCode: "03",
    kindName: "가을",
    unit: "10kg(그물망 3포기)",
    gradeCode: "04",
    note: "가을 품종만 연결합니다. 다른 철에는 시세가 비어 있을 수 있습니다.",
  },
  {
    id: "oi",
    name: "오이",
    aliases: ["오이", "다다기"],
    categoryCode: "200",
    itemCode: "223",
    kindCode: "02",
    kindName: "다다기계통",
    unit: "50개",
    gradeCode: "04",
  },
  {
    id: "gamja",
    name: "감자",
    aliases: ["감자", "수미(노지)", "수미"],
    categoryCode: "100",
    itemCode: "152",
    kindCode: "01",
    kindName: "수미(노지)",
    unit: "20kg",
    gradeCode: "04",
  },
  {
    id: "yangbaechu",
    name: "양배추",
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
    aliases: ["주키니호박", "주키니", "쥬키니", "쥬키니호박"],
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
    aliases: ["애호박"],
    categoryCode: "200",
    itemCode: "224",
    kindCode: "01",
    kindName: "애호박",
    unit: "20개",
    gradeCode: "04",
  },
];

export const BUY_ACTIONS = [
  "적극 매입",
  "관망",
  "소량 분할 매입",
  "매입 보류",
] as const;

export type BuyAction = (typeof BUY_ACTIONS)[number];

export function findItemByName(input: string): ItemDef | null {
  const q = input.trim().toLowerCase();
  if (!q) return null;
  if (q === "가을" || q === "전체" || q === "호박" || q === "풋고추" || q === "깐마늘(국산)") {
    return null;
  }
  return (
    ITEMS.find(
      (it) =>
        it.name.toLowerCase() === q ||
        it.id === q ||
        it.aliases.some((a) => a.toLowerCase() === q),
    ) ?? null
  );
}

export function findItemById(id: string): ItemDef | null {
  return ITEMS.find((it) => it.id === id) ?? null;
}

export function allowedItemNames(): string[] {
  return ITEMS.map((it) => it.name);
}
