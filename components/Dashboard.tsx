"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CategoryTab, Detail, Period, SheetResponse } from "@/lib/types";
import { MEAT_GROUP_LABEL, MEAT_ITEMS, VEG_ITEMS, type MeatGroup } from "@/lib/catalog";
import { CategoryTabs } from "./CategoryTabs";
import { ItemChips } from "./ItemChips";
import { PeriodToggle } from "./PeriodToggle";
import { PriceChart } from "./PriceChart";
import { DetailCard } from "./DetailCard";
import { AiCard } from "./AiCard";
import { AddItemModal } from "./AddItemModal";

export function Dashboard() {
  const [tab, setTab] = useState<CategoryTab>("veg");
  const [itemId, setItemId] = useState("sangchu");
  const [period, setPeriod] = useState<Period>("1m");
  const [data, setData] = useState<SheetResponse | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [availableIds, setAvailableIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [busyAdd, setBusyAdd] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const chips = useMemo(() => {
    const base =
      tab === "veg"
        ? VEG_ITEMS.map((i) => ({ id: i.id, name: i.name }))
        : MEAT_ITEMS.map((i) => ({ id: i.id, name: i.name }));
    if (!availableIds.length) return base;
    const filtered = base.filter((c) => availableIds.includes(c.id));
    return filtered.length ? filtered : base;
  }, [tab, availableIds]);

  const load = useCallback(async (category: CategoryTab, id: string, p: Period) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const q = new URLSearchParams({ category, itemCode: id, period: p });
      const res = await fetch(`/api/sheet?${q}`);
      const json = (await res.json()) as SheetResponse & { message?: string };
      if (!res.ok) {
        setData(null);
        setDetail(null);
        if (json.availableItemIds?.length) setAvailableIds(json.availableItemIds);
        setErrorMsg(json.message || json.error || "조회 실패");
        return;
      }
      setData(json);
      setDetail(json.detail);
      if (json.availableItemIds?.length) setAvailableIds(json.availableItemIds);
    } catch (e) {
      setErrorMsg((e as Error).message);
      setData(null);
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(tab, itemId, period);
  }, [tab, itemId, period, load]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 7000);
    return () => window.clearTimeout(t);
  }, [toast]);

  function switchTab(next: CategoryTab) {
    setTab(next);
    setAvailableIds([]);
    setItemId(next === "veg" ? "sangchu" : "us-hwangje-galbisal");
  }

  function selectDate(date: string) {
    if (!data) return;
    const point = data.points.find((p) => p.date === date);
    if (!point) return;
    const meta = data.metaByDate?.[date];
    const idx = data.points.findIndex((p) => p.date === date);
    let prevIdx = idx - 1;
    while (prevIdx >= 0 && data.points[prevIdx].filled) prevIdx--;
    let change: Detail["change"] = null;
    if (prevIdx >= 0 && point.price != null && data.points[prevIdx].price != null) {
      const prev = data.points[prevIdx].price!;
      const delta = point.price - prev;
      change = { delta, pct: prev === 0 ? 0 : (delta / prev) * 100 };
    }
    setDetail({
      date,
      label: `${Number(date.slice(0, 4))}년 ${Number(date.slice(5, 7))}월 ${Number(date.slice(8, 10))}일 (${point.weekday})`,
      isTradingDay: !point.filled,
      price: point.price,
      change,
      trend: meta?.trend || null,
      aiSummary: meta?.aiSummary || null,
      buyAction: meta?.buyAction || null,
    });
  }

  async function handleAdd(form: {
    itemName: string;
    meatGroup?: MeatGroup;
    origin?: string;
    brand?: string;
    part?: string;
    searchKeyword?: string;
    productUrl?: string;
  }) {
    setBusyAdd(true);
    try {
      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: tab, ...form }),
      });
      const json = (await res.json()) as {
        message?: string;
        item?: { itemCode?: string; id?: string };
        result?: { item?: { id?: string } };
      };
      if (!res.ok) throw new Error(json.message || "추가 실패");
      const newId =
        json.item?.itemCode ||
        json.result?.item?.id ||
        (tab === "veg"
          ? VEG_ITEMS.find((v) => v.name === form.itemName)?.id
          : MEAT_ITEMS.find((m) => m.name === form.itemName)?.id);
      setToast(`${form.itemName} 요청을 보냈습니다.`);
      setModalOpen(false);
      if (newId) {
        setItemId(newId);
        await load(tab, newId, period);
      } else {
        await load(tab, itemId, period);
      }
    } catch (e) {
      setToast((e as Error).message);
    } finally {
      setBusyAdd(false);
    }
  }

  const itemLabel = data
    ? [
        data.item.name,
        data.item.origin,
        data.item.kindName,
        data.item.unit,
      ]
        .filter(Boolean)
        .join(" · ")
    : "";

  return (
    <div className="mx-auto max-w-[920px] px-3 pb-12 pt-4 sm:px-4">
      <header className="rounded-[22px] bg-gradient-to-br from-forest to-forest-deep px-4 py-4 text-emerald-50 shadow-card sm:px-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs opacity-85">gogiparty. 매입 예측</p>
            <h1 className="mt-1 text-[clamp(1.35rem,4vw,1.85rem)] font-extrabold tracking-tight">
              {tab === "veg" ? "야채 시세와 매입 타이밍" : "육류 시세와 매입 타이밍"}
            </h1>
            <p className="mt-2 hidden max-w-xl text-sm leading-relaxed opacity-90 sm:block">
              채소·육류 도매가를 한곳에서 보고, Gemini가 제안하는 10~20일 매입 타이밍을 참고합니다.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="shrink-0 rounded-full bg-white px-3.5 py-2.5 text-sm font-bold text-forest shadow"
          >
            <span className="sm:hidden">+ 품목</span>
            <span className="hidden sm:inline">+ 신규 품목 추가</span>
          </button>
        </div>
      </header>

      <div className="mt-4 flex flex-col gap-3">
        <CategoryTabs value={tab} onChange={switchTab} />
        <ItemChips items={chips} activeId={itemId} onSelect={setItemId} />
        <PeriodToggle value={period} onChange={setPeriod} />

        {loading ? <p className="text-sm text-stone-500">불러오는 중…</p> : null}

        {!loading && errorMsg ? (
          <section className="rounded-[18px] border border-paper-line bg-paper-card p-4 shadow-card">
            <h2 className="text-lg font-bold">시세를 불러오지 못했습니다</h2>
            <p className="mt-2 text-sm text-stone-600">{errorMsg}</p>
            <p className="mt-3 text-xs text-stone-500">
              Vercel/로컬 환경변수에 {tab === "meat" ? "MEAT_SHEET_CSV_URL" : "VEG_SHEET_CSV_URL"} 과
              GAS_WEBAPP_URL을 확인하세요.
            </p>
          </section>
        ) : null}

        {!loading && data ? (
          <>
            <PriceChart
              title={`${data.item.name} ${data.item.unit}`}
              subtitle={`${data.rangeLabel} · ${tab === "meat" ? "B2B 도매가" : "도매 상품"}`}
              note={data.item.note}
              points={data.points}
              monthlies={data.monthlies}
              showMonthly={period === "2y" && data.monthlies.length > 0}
              tradeDays={data.tradeDays}
              lastTradeLabel={data.selectedLabel}
              selectedDate={detail?.date ?? data.selectedDate}
              onSelectDate={selectDate}
            />
            <DetailCard detail={detail} itemLabel={itemLabel} />
            <AiCard action={detail?.buyAction ?? null} summary={detail?.aiSummary ?? null} />
          </>
        ) : null}
      </div>

      <AddItemModal
        open={modalOpen}
        category={tab}
        busy={busyAdd}
        meatGroups={MEAT_GROUP_LABEL}
        onClose={() => !busyAdd && setModalOpen(false)}
        onSubmit={handleAdd}
      />

      {toast ? (
        <div className="fixed bottom-5 left-1/2 z-50 max-w-[min(520px,calc(100%-24px))] -translate-x-1/2 rounded-2xl bg-stone-900 px-4 py-3 text-sm text-white shadow-card">
          {toast}
        </div>
      ) : null}

      {busyAdd ? (
        <div className="fixed inset-0 z-40 grid place-content-center gap-3 bg-paper/60 text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-[3px] border-emerald-200 border-t-forest" />
          <p className="text-sm text-stone-700">품목 시세를 수집하는 중…</p>
        </div>
      ) : null}
    </div>
  );
}
