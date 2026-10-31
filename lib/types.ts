export type Period = "1m" | "6m" | "2y";
export type CategoryTab = "veg" | "meat";

export type ChartPoint = {
  date: string;
  price: number | null;
  filled: boolean;
  md: string;
  weekday: string;
};

export type Detail = {
  date: string;
  label: string;
  isTradingDay: boolean;
  price: number | null;
  change: { delta: number; pct: number } | null;
  trend: string | null;
  aiSummary: string | null;
  buyAction: string | null;
};

export type SheetResponse = {
  source: string;
  category: CategoryTab;
  item: {
    id: string;
    name: string;
    kindName: string;
    unit: string;
    note: string | null;
    meatGroup?: string | null;
    origin?: string | null;
  };
  period: Period;
  rangeLabel: string;
  points: ChartPoint[];
  monthlies: { date: string; price: number }[];
  tradeDays: number;
  selectedDate: string | null;
  selectedLabel: string | null;
  detail: Detail | null;
  metaByDate?: Record<string, { trend: string; aiSummary: string; buyAction: string }>;
  availableItemIds?: string[];
  error?: string;
  message?: string;
};
