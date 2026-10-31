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

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQ = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQ = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
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
  const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return { dailies: [], monthlies: [] };

  const headers = splitCsvLine(lines[0]).map(normalizeHeader);
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

  for (let r = 1; r < lines.length; r++) {
    const cols = splitCsvLine(lines[r]);
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
  const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]).map(normalizeHeader);
  const iCode = headers.findIndex((h) => h === "품목코드");
  const iName = headers.findIndex((h) => h === "품목명");
  const ids = new Set<string>();

  for (let r = 1; r < lines.length; r++) {
    const cols = splitCsvLine(lines[r]);
    const code = (cols[iCode] ?? "").trim();
    const name = (cols[iName] ?? "").trim();
    if (code && findItemById(code)) ids.add(code);
    const byName = ITEMS.find((x) => x.name === name);
    if (byName) ids.add(byName.id);
  }
  return [...ids];
}
