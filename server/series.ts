export type PricePoint = {
  date: string; // YYYY-MM-DD
  price: number | null;
  filled: boolean;
  raw: number | null;
};

export type MonthlyPoint = {
  date: string; // YYYY-MM-01
  price: number;
};

const SEOUL = "Asia/Seoul";

export function seoulToday(): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SEOUL,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const y = Number(parts.find((p) => p.type === "year")!.value);
  const m = Number(parts.find((p) => p.type === "month")!.value);
  const d = Number(parts.find((p) => p.type === "day")!.value);
  return new Date(Date.UTC(y, m - 1, d));
}

export function formatYmd(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseYmd(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

export function addMonths(d: Date, n: number): Date {
  const x = new Date(d);
  x.setUTCMonth(x.getUTCMonth() + n);
  return x;
}

export function periodRange(period: "1m" | "6m" | "2y"): { start: string; end: string } {
  const end = addDays(seoulToday(), -1);
  let start: Date;
  if (period === "1m") start = addMonths(end, -1);
  else if (period === "6m") start = addMonths(end, -6);
  else start = addMonths(end, -24);
  return { start: formatYmd(start), end: formatYmd(end) };
}

/** Parse KAMIS price string: commas, "-", empty → null */
export function parsePrice(raw: unknown): number | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s || s === "-" || s === "−") return null;
  const n = Number(s.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

export function weekdayKo(date: string): string {
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return days[parseYmd(date).getUTCDay()];
}

export function formatKoLong(date: string): string {
  const d = parseYmd(date);
  return `${d.getUTCFullYear()}년 ${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 (${weekdayKo(date)})`;
}

export function formatMd(date: string): string {
  const d = parseYmd(date);
  return `${String(d.getUTCMonth() + 1).padStart(2, "0")}.${String(d.getUTCDate()).padStart(2, "0")}`;
}

export function formatDotRange(start: string, end: string): string {
  const a = parseYmd(start);
  const b = parseYmd(end);
  const f = (d: Date) =>
    `${d.getUTCFullYear()}.${String(d.getUTCMonth() + 1).padStart(2, "0")}.${String(d.getUTCDate()).padStart(2, "0")}`;
  return `${f(a)} – ${f(b)}`;
}

/**
 * Build calendar axis from start..end, fill gaps with previous trade price.
 * Input map: date → traded price (only real trades).
 */
export function buildFilledSeries(
  trades: Map<string, number>,
  start: string,
  end: string,
): PricePoint[] {
  const out: PricePoint[] = [];
  let cursor = parseYmd(start);
  const last = parseYmd(end);
  let prev: number | null = null;

  // seed prev from any trade before start
  for (const [d, p] of [...trades.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    if (d < start) prev = p;
    else break;
  }

  while (cursor.getTime() <= last.getTime()) {
    const date = formatYmd(cursor);
    const raw = trades.has(date) ? trades.get(date)! : null;
    if (raw != null) {
      prev = raw;
      out.push({ date, price: raw, filled: false, raw });
    } else {
      out.push({ date, price: prev, filled: true, raw: null });
    }
    cursor = addDays(cursor, 1);
  }
  return out;
}

export function lastTradeDate(points: PricePoint[]): string | null {
  for (let i = points.length - 1; i >= 0; i--) {
    if (!points[i].filled && points[i].raw != null) return points[i].date;
  }
  return null;
}

export function dayChange(
  points: PricePoint[],
  date: string,
): { delta: number; pct: number } | null {
  const idx = points.findIndex((p) => p.date === date);
  if (idx < 0 || points[idx].price == null) return null;
  let prevIdx = idx - 1;
  while (prevIdx >= 0 && (points[prevIdx].filled || points[prevIdx].raw == null)) {
    prevIdx--;
  }
  if (prevIdx < 0 || points[prevIdx].price == null) return null;
  const cur = points[idx].price!;
  const prev = points[prevIdx].price!;
  const delta = cur - prev;
  const pct = prev === 0 ? 0 : (delta / prev) * 100;
  return { delta, pct };
}

export function filterPeriod(
  trades: Map<string, number>,
  period: "1m" | "6m" | "2y",
): { start: string; end: string; points: PricePoint[] } {
  const { start, end } = periodRange(period);
  const points = buildFilledSeries(trades, start, end);
  return { start, end, points };
}
