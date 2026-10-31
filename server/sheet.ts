import { ITEMS, findItemById, type ItemDef } from "./catalog.js";
import { parsePrice, type MonthlyPoint } from "./series.js";

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

export type SheetBundle = {
  dailies: SheetDailyRow[];
  monthlies: MonthlyPoint[];
};

/**
 * Quote-aware CSV parse. Newlines inside "..." stay in the same field/row
 * (Google Sheet 거래동향 multiline cells).
 */
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
        } else {
          inQ = false;
        }
      } else {
        cur += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQ = true;
    } else if (ch === ",") {
      row.push(cur);
      cur = "";
    } else if (ch === "\n") {
      row.push(cur);
      cur = "";
      if (row.some((c) => c.trim().length > 0)) rows.push(row);
      row = [];
    } else if (ch === "\r") {
      // ignore; handle \r\n via \n
    } else {
      cur += ch;
    }
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
  if (m) {
    return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  }
  return null;
}

export async function fetchSheetCsv(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "kamis-dashboard/1.0" },
    redirect: "follow",
  });
  const text = await res.text();
  if (!res.ok) {
    throw Object.assign(new Error(`Sheet HTTP ${res.status}`), { code: "SHEET_HTTP" });
  }
  if (/<!DOCTYPE html/i.test(text) && /accounts\.google|Sign in/i.test(text)) {
    throw Object.assign(new Error("Sheet requires login"), { code: "SHEET_LOGIN" });
  }
  return text;
}

export function parseSheetCsvForItem(csv: string, item: ItemDef): SheetBundle {
  const records = parseCsvRecords(csv);
  if (records.length < 2) return { dailies: [], monthlies: [] };

  const headers = records[0].map(normalizeHeader);
  const idx = (name: string) => headers.findIndex((h) => h === name);
  const iDate = idx("날짜");
  const iCode = idx("품목코드");
  const iName = idx("품목명");
  const iKind = idx("구분");
  const iPrice = idx("도매가");
  const iUnit = idx("단위");
  const iTrend = idx("거래동향");
  const iAi = idx("AI_예측");
  const iAction = idx("매입액션");
  const iCollected = idx("수집시각");

  const dailies: SheetDailyRow[] = [];
  const monthlies: MonthlyPoint[] = [];

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
      trend: (cols[iTrend] ?? "").trim(),
      aiSummary: (cols[iAi] ?? "").trim(),
      buyAction: (cols[iAction] ?? "").trim(),
      collectedAt: (cols[iCollected] ?? "").trim(),
    });
  }

  dailies.sort((a, b) => a.date.localeCompare(b.date));
  monthlies.sort((a, b) => a.date.localeCompare(b.date));
  return { dailies, monthlies };
}

export function itemIdsInSheet(csv: string): string[] {
  const records = parseCsvRecords(csv);
  if (records.length < 2) return [];
  const headers = records[0].map(normalizeHeader);
  const iCode = headers.findIndex((h) => h === "품목코드");
  const iName = headers.findIndex((h) => h === "품목명");
  const ids = new Set<string>();

  for (let r = 1; r < records.length; r++) {
    const cols = records[r];
    const code = (cols[iCode] ?? "").trim();
    const name = (cols[iName] ?? "").trim();
    if (code && findItemById(code)) ids.add(code);
    const byName = ITEMS.find((x) => x.name === name);
    if (byName) ids.add(byName.id);
  }
  return [...ids];
}
