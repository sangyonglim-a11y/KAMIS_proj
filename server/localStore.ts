import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ItemDef } from "./catalog.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const storePath = path.join(dataDir, "forecast-sheet.json");

export type LocalDaily = {
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

export type LocalStore = {
  items: { id: string; name: string; unit: string }[];
  dailies: LocalDaily[];
};

async function ensure(): Promise<void> {
  await mkdir(dataDir, { recursive: true });
}

export async function loadLocalStore(): Promise<LocalStore> {
  try {
    const raw = await readFile(storePath, "utf8");
    return JSON.parse(raw) as LocalStore;
  } catch {
    return { items: [], dailies: [] };
  }
}

export async function saveLocalStore(store: LocalStore): Promise<void> {
  await ensure();
  await writeFile(storePath, JSON.stringify(store, null, 2), "utf8");
}

export async function upsertLocalItem(
  item: ItemDef,
  rows: Omit<LocalDaily, "itemCode" | "itemName" | "unit">[],
): Promise<LocalStore> {
  const store = await loadLocalStore();
  if (!store.items.some((i) => i.id === item.id)) {
    store.items.push({ id: item.id, name: item.name, unit: item.unit });
  }
  const keep = store.dailies.filter((d) => d.itemCode !== item.id);
  const stamped = rows.map((r) => ({
    ...r,
    itemCode: item.id,
    itemName: item.name,
    unit: item.unit,
  }));
  // dedupe by date
  const byDate = new Map<string, LocalDaily>();
  for (const r of stamped) byDate.set(r.date, r);
  store.dailies = [...keep, ...byDate.values()].sort((a, b) =>
    a.date.localeCompare(b.date) || a.itemCode.localeCompare(b.itemCode),
  );
  await saveLocalStore(store);
  return store;
}

export function localItemIds(store: LocalStore): string[] {
  return store.items.map((i) => i.id);
}
