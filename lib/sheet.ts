import { findItemById, type Category, type ItemDef, ALL_ITEMS } from "./catalog";
import { parsePrice, type PricePoint, filterPeriod, formatDotRange, formatKoLong, weekdayKo, dayChange, lastTradeDate } from "./series";

export type SheetDailyRow = {
  date: string;
  itemCode: string;
  itemName: string;
  price: number;
  unit: string;
  trend: string;
  aiSummary: string;
  buyAction: string;
  collectedAt: string;
};

export function parseCsvRecords(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQ = false;

  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i];
    if (inQ) {
      if (ch === '"') {
        if (csv[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQ = false;
      } else cur += ch;
      continue;
    }
    if (ch === '"') inQ = true;
    else if (ch === ",") {
      row.push(cur);
      cur = "";
    } else if (ch === "\n") {
      row.push(cur);
      cur = "";
      if (row.some((c) => c.trim().length > 0)) rows.push(row);
      row = [];
    } else if (ch !== "\r") cur += ch;
  }
  row.push(cur);
  if (row.some((c) => c.trim().length > 0)) rows.push(row);
  return rows;
}

function normalizeHeader(h: string): string {
  return h.replace(/^\uFEFF/, "").trim();
}

function toIsoDate(raw: string): string | null {
  const s = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{4})[./](\d{1,2})[./](\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  return null;
}

export async function fetchSheetCsv(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "gogiparty-dashboard/2.0" },
    redirect: "follow",
    next: { revalidate: 120 },
  });
  const text = await res.text();
  if (!res.ok) throw Object.assign(new Error(`Sheet HTTP ${res.status}`), { code: "SHEET_HTTP" });
  if (/<!DOCTYPE html/i.test(text) && /accounts\.google|Sign in/i.test(text)) {
    throw Object.assign(new Error("Sheet requires login"), { code: "SHEET_LOGIN" });
  }
  return text;
}

export function csvUrlForCategory(category: Category): string {
  if (category === "meat") {
    return (
      process.env.MEAT_SHEET_CSV_URL?.trim() ||
      process.env.SHEET_CSV_URL?.trim() ||
      ""
    );
  }
  return (
    process.env.VEG_SHEET_CSV_URL?.trim() ||
    process.env.SHEET_CSV_URL?.trim() ||
    ""
  );
}

export function parseSheetCsvForItem(csv: string, item: ItemDef) {
  const records = parseCsvRecords(csv);
  if (records.length < 2) return { dailies: [] as SheetDailyRow[], monthlies: [] as { date: string; price: number }[] };

  const headers = records[0].map(normalizeHeader);
  const idx = (name: string) => headers.findIndex((h) => h === name || h === name.replace("_", ""));
  const iDate = idx("날짜");
  const iCode = idx("품목코드");
  const iName = idx("품목명");
  const iKind = idx("구분");
  const iPrice = Math.max(idx("도매가"), idx("가격"), idx("평균가"));
  const iUnit = idx("단위");
  const iTrend = Math.max(idx("거래동향"), idx("비고"));
  const iAi = Math.max(idx("AI_예측"), idx("AI예측"));
  const iAction = Math.max(idx("매입액션"), idx("매입추천"));
  const iCollected = idx("수집시각");

  const dailies: SheetDailyRow[] = [];
  const monthlies: { date: string; price: number }[] = [];

  for (let r = 1; r < records.length; r++) {
    const cols = records[r];
    const code = (cols[iCode] ?? "").trim();
    const name = (cols[iName] ?? "").trim();
    if (code !== item.id && name !== item.name) continue;

    const date = iDate >= 0 ? toIsoDate(cols[iDate] ?? "") : null;
    if (!date) continue;
    const kind = (cols[iKind] ?? "").trim();
    const price = parsePrice(cols[iPrice]);
    if (price == null) continue;

    if (kind === "월간") {
      monthlies.push({ date: `${date.slice(0, 7)}-01`, price });
      continue;
    }
    if (kind && kind !== "일별") continue;

    dailies.push({
      date,
      itemCode: code || item.id,
      itemName: name || item.name,
      price,
      unit: (cols[iUnit] ?? "").trim() || item.unit,
      trend: iTrend >= 0 ? (cols[iTrend] ?? "").trim() : "",
      aiSummary: iAi >= 0 ? (cols[iAi] ?? "").trim() : "",
      buyAction: iAction >= 0 ? (cols[iAction] ?? "").trim() : "",
      collectedAt: iCollected >= 0 ? (cols[iCollected] ?? "").trim() : "",
    });
  }

  dailies.sort((a, b) => a.date.localeCompare(b.date));
  monthlies.sort((a, b) => a.date.localeCompare(b.date));
  return { dailies, monthlies };
}

export function itemIdsInSheet(csv: string, category: Category): string[] {
  const records = parseCsvRecords(csv);
  if (records.length < 2) return [];
  const headers = records[0].map(normalizeHeader);
  const iCode = headers.findIndex((h) => h === "품목코드");
  const iName = headers.findIndex((h) => h === "품목명");
  const pool = ALL_ITEMS.filter((i) => i.category === category);
  const ids = new Set<string>();
  for (let r = 1; r < records.length; r++) {
    const cols = records[r];
    const code = (cols[iCode] ?? "").trim();
    const name = (cols[iName] ?? "").trim();
    if (code && findItemById(code)?.category === category) ids.add(code);
    const byName = pool.find((x) => x.name === name);
    if (byName) ids.add(byName.id);
  }
  return [...ids];
}

export function buildSheetPayload(
  item: ItemDef,
  period: "1m" | "6m" | "2y",
  dailies: SheetDailyRow[],
  monthlies: { date: string; price: number }[],
  source: string,
  availableItemIds: string[],
) {
  const trades = new Map<string, number>();
  const meta = new Map<string, { trend: string; aiSummary: string; buyAction: string }>();
  for (const r of dailies) {
    trades.set(r.date, r.price);
    meta.set(r.date, {
      trend: r.trend,
      aiSummary: r.aiSummary,
      buyAction: r.buyAction,
    });
  }
  const series = filterPeriod(trades, period);
  const selected = lastTradeDate(series.points);
  const m = selected ? meta.get(selected) : undefined;
  const monthInRange =
    period === "2y"
      ? monthlies.filter((x) => x.date >= series.start && x.date <= series.end)
      : [];

  return {
    source,
    category: item.category,
    item: {
      id: item.id,
      name: item.name,
      kindName: item.kindName ?? item.part ?? "",
      unit: dailies[0]?.unit || item.unit,
      note: item.note ?? null,
      meatGroup: item.meatGroup ?? null,
      origin: item.origin ?? null,
    },
    period,
    rangeLabel: formatDotRange(series.start, series.end),
    start: series.start,
    end: series.end,
    points: series.points.map((p: PricePoint) => ({
      date: p.date,
      price: p.price,
      filled: p.filled,
      md: `${p.date.slice(5, 7)}.${p.date.slice(8, 10)}`,
      weekday: weekdayKo(p.date),
    })),
    monthlies: monthInRange,
    tradeDays: series.points.filter((p) => !p.filled && p.raw != null).length,
    selectedDate: selected,
    selectedLabel: selected ? formatKoLong(selected) : null,
    detail: selected
      ? {
          date: selected,
          label: formatKoLong(selected),
          isTradingDay: true,
          price: series.points.find((p) => p.date === selected)?.price ?? null,
          change: dayChange(series.points, selected),
          trend: m?.trend || null,
          aiSummary: m?.aiSummary || null,
          buyAction: m?.buyAction || null,
        }
      : null,
    metaByDate: Object.fromEntries(meta),
    availableItemIds,
  };
}
