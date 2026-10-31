import type { CatalogItem, Health, Period, SheetResponse } from "./types";

async function readJson<T>(res: Response): Promise<T> {
  const data = (await res.json()) as T & { message?: string; error?: string };
  if (!res.ok) {
    const err = new Error(data.message || data.error || `HTTP ${res.status}`);
    Object.assign(err, { status: res.status, body: data });
    throw err;
  }
  return data;
}

export async function fetchHealth(): Promise<Health> {
  const res = await fetch("/api/health");
  return readJson(res);
}

export async function fetchCatalog(): Promise<CatalogItem[]> {
  const res = await fetch("/api/catalog");
  const data = await readJson<{ items: CatalogItem[] }>(res);
  return data.items;
}

export async function fetchSheet(
  itemCode: string,
  period: Period,
): Promise<SheetResponse> {
  const q = new URLSearchParams({ itemCode, period });
  const res = await fetch(`/api/sheet?${q}`);
  return readJson(res);
}

export async function addItem(itemName: string): Promise<{
  ok: boolean;
  via: string;
  item: { id: string; name: string };
  warn?: string | null;
  message?: string;
}> {
  const res = await fetch("/api/items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ itemName }),
  });
  return readJson(res);
}
