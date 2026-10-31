import type { ItemDef } from "./catalog.js";
import { parsePrice } from "./series.js";

const KAMIS_URL = "https://www.kamis.or.kr/service/price/xml.do";

export type KamisTradeMap = Map<string, number>;

type KamisItem = {
  countyname?: string;
  yyyy?: string;
  regday?: string;
  price?: string;
};

function inRange(date: string, start: string, end: string): boolean {
  return date >= start && date <= end;
}

export async function fetchPeriodProductList(opts: {
  certKey: string;
  certId: string;
  item: ItemDef;
  start: string;
  end: string;
  gradeCode: string;
}): Promise<KamisTradeMap> {
  const { certKey, certId, item, start, end, gradeCode } = opts;
  const params = new URLSearchParams({
    action: "periodProductList",
    p_cert_key: certKey,
    p_cert_id: certId,
    p_returntype: "json",
    p_startday: start,
    p_endday: end,
    p_productclscode: "02",
    p_itemcategorycode: item.categoryCode,
    p_itemcode: item.itemCode,
    p_productrankcode: gradeCode,
    p_countrycode: "",
    p_convert_kg_yn: "N",
  });
  if (item.kindCode != null) {
    params.set("p_kindcode", item.kindCode);
  }

  const res = await fetch(`${KAMIS_URL}?${params.toString()}`, {
    headers: { "User-Agent": "kamis-dashboard/1.0" },
  });
  if (!res.ok) {
    throw Object.assign(new Error(`KAMIS HTTP ${res.status}`), { code: "KAMIS_HTTP" });
  }

  const json = (await res.json()) as {
    data?: { error_code?: string; item?: KamisItem[] | KamisItem };
  };
  const err = json?.data?.error_code;
  if (err && err !== "000") {
    // 001 no data etc. — return empty rather than crash
    return new Map();
  }

  const raw = json?.data?.item;
  const items: KamisItem[] = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const map: KamisTradeMap = new Map();

  for (const row of items) {
    if ((row.countyname ?? "").trim() !== "평균") continue;
    const yyyy = (row.yyyy ?? "").trim();
    const reg = (row.regday ?? "").trim(); // MM/DD
    if (!yyyy || !/^\d{2}\/\d{2}$/.test(reg)) continue;
    const [mm, dd] = reg.split("/");
    const date = `${yyyy}-${mm}-${dd}`;
    if (!inRange(date, start, end)) continue;
    const price = parsePrice(row.price);
    if (price == null) continue;
    map.set(date, price);
  }

  return map;
}
