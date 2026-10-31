import type { ItemDef } from "./catalog.js";
import { addDays, formatYmd, parseYmd, parsePrice } from "./series.js";

const BASE = "https://apis.data.go.kr/B552845/perDay/price";

type PublicRow = {
  exmn_ymd?: string;
  se_cd?: string;
  exmn_dd_prc?: string | number;
  vrty_cd?: string;
  grd_cd?: string;
};

/**
 * Fetch daily wholesale (중도매 02, 상품 04) market rows and average by date.
 * Mu: no variety filter — average all varieties for the day.
 */
export async function fetchPublicDaily(opts: {
  serviceKey: string;
  item: ItemDef;
  start: string; // YYYY-MM-DD
  end: string;
}): Promise<Map<string, number>> {
  const { serviceKey, item, start, end } = opts;
  const startYmd = start.replace(/-/g, "");
  const endYmd = end.replace(/-/g, "");

  const byDate = new Map<string, number[]>();
  let pageNo = 1;
  const numOfRows = 1000;

  for (;;) {
    const params = new URLSearchParams({
      serviceKey,
      returnType: "json",
      pageNo: String(pageNo),
      numOfRows: String(numOfRows),
      "cond[exmn_ymd::GTE]": startYmd,
      "cond[exmn_ymd::LTE]": endYmd,
      "cond[ctgry_cd::EQ]": item.categoryCode,
      "cond[item_cd::EQ]": item.itemCode,
      "cond[se_cd::EQ]": "02",
      "cond[grd_cd::EQ]": "04",
    });
    if (item.kindCode != null) {
      params.set("cond[vrty_cd::EQ]", item.kindCode);
    }

    const res = await fetch(`${BASE}?${params.toString()}`, {
      headers: { "User-Agent": "kamis-dashboard/1.0" },
    });
    if (!res.ok) {
      throw Object.assign(new Error(`Public API HTTP ${res.status}`), {
        code: "PUBLIC_HTTP",
      });
    }
    const json = (await res.json()) as {
      response?: {
        body?: {
          items?: PublicRow[] | { item?: PublicRow[] };
          totalCount?: number | string;
        };
      };
      body?: { items?: PublicRow[]; totalCount?: number };
    };

    const body = json.response?.body ?? json.body;
    const itemsRaw = body?.items;
    const rows: PublicRow[] = Array.isArray(itemsRaw)
      ? itemsRaw
      : Array.isArray((itemsRaw as { item?: PublicRow[] })?.item)
        ? (itemsRaw as { item: PublicRow[] }).item
        : [];

    for (const row of rows) {
      const ymd = String(row.exmn_ymd ?? "").replace(/-/g, "");
      if (ymd.length !== 8) continue;
      const date = `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`;
      if (date < start || date > end) continue;
      const price = parsePrice(row.exmn_dd_prc);
      if (price == null) continue;
      const arr = byDate.get(date) ?? [];
      arr.push(price);
      byDate.set(date, arr);
    }

    const total = Number(body?.totalCount ?? 0);
    if (rows.length < numOfRows || pageNo * numOfRows >= total) break;
    pageNo += 1;
    if (pageNo > 40) break;
  }

  const avg = new Map<string, number>();
  for (const [date, prices] of byDate) {
    const sum = prices.reduce((a, b) => a + b, 0);
    avg.set(date, Math.round(sum / prices.length));
  }
  return avg;
}

/** Chunk ~2 years into 180-day windows for collection. */
export function twoYearChunks(end: string): { start: string; end: string }[] {
  const endD = parseYmd(end);
  const startD = addDays(endD, -730);
  const chunks: { start: string; end: string }[] = [];
  let cursor = startD;
  while (cursor.getTime() <= endD.getTime()) {
    const chunkEnd = addDays(cursor, 179);
    const capped = chunkEnd.getTime() > endD.getTime() ? endD : chunkEnd;
    chunks.push({ start: formatYmd(cursor), end: formatYmd(capped) });
    cursor = addDays(capped, 1);
  }
  return chunks;
}
