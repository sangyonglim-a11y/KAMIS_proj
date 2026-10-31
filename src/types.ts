export type Period = "1m" | "6m" | "2y";

export type CatalogItem = {
  id: string;
  name: string;
  kindName: string;
  unit: string;
  note: string | null;
};

export type ChartPoint = {
  date: string;
  price: number | null;
  filled: boolean;
  md: string;
  weekday: string;
  midPrice?: number | null;
};

export type Detail = {
  date: string;
  label: string;
  isTradingDay: boolean;
  price: number | null;
  midPrice?: number | null;
  change: { delta: number; pct: number } | null;
  trend: string | null;
  aiSummary: string | null;
  buyAction: string | null;
};

export type SheetResponse = {
  source: string;
  item: CatalogItem;
  period: Period;
  rangeLabel: string;
  start: string;
  end: string;
  points: ChartPoint[];
  monthlies: { date: string; price: number }[];
  tradeDays: number;
  selectedDate: string | null;
  selectedLabel: string | null;
  detail: Detail | null;
  metaByDate?: Record<
    string,
    { trend: string; aiSummary: string; buyAction: string }
  >;
  compareYearNote?: string | null;
  availableItemIds?: string[];
  error?: string;
  message?: string;
};

export type Health = {
  ok: boolean;
  sheet: boolean;
  gas: boolean;
  kamis: boolean;
  publicData: boolean;
};
