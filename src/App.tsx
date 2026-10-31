import { useCallback, useEffect, useMemo, useState } from "react";
import { addItem, fetchCatalog, fetchHealth, fetchSheet } from "./api";
import { AddItemModal } from "./components/AddItemModal";
import { AiCard } from "./components/AiCard";
import { DetailCard } from "./components/DetailCard";
import { EmptyState } from "./components/EmptyState";
import { Header } from "./components/Header";
import { ItemChips } from "./components/ItemChips";
import { PeriodToggle } from "./components/PeriodToggle";
import { PriceChart } from "./components/PriceChart";
import type { CatalogItem, Detail, Health, Period, SheetResponse } from "./types";

export default function App() {
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [health, setHealth] = useState<Health | null>(null);
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

  useEffect(() => {
    void (async () => {
      try {
        const [items, h] = await Promise.all([fetchCatalog(), fetchHealth()]);
        setCatalog(items);
        setHealth(h);
      } catch {
        setErrorMsg("서버에 연결하지 못했습니다. npm run dev로 API(3001)와 Vite를 함께 켜 주세요.");
      }
    })();
  }, []);

  const load = useCallback(async (id: string, p: Period) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetchSheet(id, p);
      setData(res);
      setDetail(res.detail);
      if (res.availableItemIds?.length) setAvailableIds(res.availableItemIds);
    } catch (e) {
      const body = (e as { body?: SheetResponse & { message?: string } }).body;
      setData(null);
      setDetail(null);
      if (body?.availableItemIds?.length) setAvailableIds(body.availableItemIds);
      setErrorMsg(body?.message || (e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(itemId, period);
  }, [itemId, period, load]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 7000);
    return () => window.clearTimeout(t);
  }, [toast]);

  const sourceLabel = useMemo(() => {
    if (data?.source === "sheet") return "구글 시트 도매가 · 매입 예측";
    if (data?.source === "local") return "로컬 저장 도매가 · 매입 예측";
    if (data?.source === "public") return "공공데이터포털 일별 도매가";
    if (health?.sheet) return "구글 시트 도매가 · 매입 예측";
    if (health?.publicData) return "공공데이터포털 일별 도매가";
    return "KAMIS 도매 시세";
  }, [data, health]);

  const visibleItems = useMemo(() => {
    if (!catalog.length) return [];
    if (availableIds.length > 0) {
      const filtered = catalog.filter((c) => availableIds.includes(c.id));
      return filtered.length ? filtered : catalog;
    }
    return catalog;
  }, [catalog, availableIds]);

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

  async function handleAdd(name: string) {
    setBusyAdd(true);
    try {
      const res = await addItem(name);
      setToast(
        res.warn
          ? `${res.item.name} 추가 · ${res.warn}`
          : `${res.item.name} 시세를 모았습니다.`,
      );
      setModalOpen(false);
      setItemId(res.item.id);
      await load(res.item.id, period);
    } catch (e) {
      setToast((e as Error).message);
    } finally {
      setBusyAdd(false);
    }
  }

  const itemLabel = data
    ? `${data.item.name}${data.item.kindName ? ` · ${data.item.kindName}` : ""} · ${data.item.unit}`
    : "";

  const missingConfig = errorMsg?.includes("SHEET_CSV_URL") || errorMsg?.includes("구글 시트");

  return (
    <div className="app">
      <Header sourceLabel={sourceLabel} onAdd={() => setModalOpen(true)} />

      <main className="main">
        <ItemChips
          items={visibleItems.length ? visibleItems : catalog}
          activeId={itemId}
          onSelect={setItemId}
        />
        <PeriodToggle value={period} onChange={setPeriod} />

        {loading ? <p className="status">불러오는 중…</p> : null}

        {!loading && missingConfig ? <EmptyState message={errorMsg!} /> : null}

        {!loading && !missingConfig && errorMsg ? (
          <section className="card empty-card">
            <h2>시세를 불러오지 못했습니다</h2>
            <p>{errorMsg}</p>
          </section>
        ) : null}

        {!loading && data ? (
          <>
            <PriceChart
              title={`${data.item.name} ${data.item.unit}`}
              subtitle={`${data.rangeLabel} · 도매 상품`}
              note={data.item.note || data.compareYearNote}
              points={data.points}
              monthlies={data.monthlies}
              showMonthly={period === "2y" && data.monthlies.length > 0}
              tradeDays={data.tradeDays}
              lastTradeLabel={data.selectedLabel}
              selectedDate={detail?.date ?? data.selectedDate}
              onSelectDate={selectDate}
            />
            <DetailCard detail={detail} itemLabel={itemLabel} />
            <AiCard
              action={detail?.buyAction ?? null}
              summary={detail?.aiSummary ?? null}
            />
          </>
        ) : null}
      </main>

      <AddItemModal
        open={modalOpen}
        busy={busyAdd}
        onClose={() => !busyAdd && setModalOpen(false)}
        onSubmit={handleAdd}
      />

      {toast ? <div className="toast">{toast}</div> : null}
      {busyAdd ? (
        <div className="busy-overlay" aria-live="polite">
          <div className="spinner" />
          <p>품목 시세를 수집하는 중…</p>
        </div>
      ) : null}
    </div>
  );
}
