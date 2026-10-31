import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ITEMS,
  allowedItemNames,
  findItemById,
  findItemByName,
  type ItemDef,
} from "./catalog.js";
import { forecastBuyTiming } from "./gemini.js";
import { fetchPeriodProductList } from "./kamis.js";
import { loadLocalStore, localItemIds, upsertLocalItem } from "./localStore.js";
import { fetchPublicDaily, twoYearChunks } from "./publicData.js";
import {
  dayChange,
  filterPeriod,
  formatDotRange,
  formatKoLong,
  formatYmd,
  lastTradeDate,
  periodRange,
  seoulToday,
  addDays,
  weekdayKo,
} from "./series.js";
import { fetchSheetCsv, itemIdsInSheet, parseSheetCsvForItem } from "./sheet.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
dotenv.config({ path: path.join(root, ".env.local") });
dotenv.config({ path: path.join(root, ".env") });

const PORT = Number(process.env.PORT || 3001);
const SHEET_CSV_URL = process.env.SHEET_CSV_URL?.trim() || "";
const GAS_WEBAPP_URL = process.env.GAS_WEBAPP_URL?.trim() || "";
const GAS_APP_TOKEN = process.env.GAS_APP_TOKEN?.trim() || "";
const KAMIS_CERT_KEY = process.env.KAMIS_CERT_KEY?.trim() || "";
const KAMIS_CERT_ID = process.env.KAMIS_CERT_ID?.trim() || "";
const DATA_GO_KR_SERVICE_KEY = process.env.DATA_GO_KR_SERVICE_KEY?.trim() || "";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY?.trim() || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    sheet: Boolean(SHEET_CSV_URL),
    gas: Boolean(GAS_WEBAPP_URL),
    kamis: Boolean(KAMIS_CERT_KEY && KAMIS_CERT_ID),
    publicData: Boolean(DATA_GO_KR_SERVICE_KEY),
  });
});

app.get("/api/catalog", (_req, res) => {
  res.json({
    items: ITEMS.map((it) => ({
      id: it.id,
      name: it.name,
      kindName: it.kindName,
      unit: it.unit,
      note: it.note ?? null,
    })),
  });
});

type Period = "1m" | "6m" | "2y";

function parsePeriod(raw: unknown): Period {
  if (raw === "6m" || raw === "2y" || raw === "1m") return raw;
  return "1m";
}

async function resolveAvailableItemIds(): Promise<string[]> {
  if (SHEET_CSV_URL) {
    try {
      const csv = await fetchSheetCsv(SHEET_CSV_URL);
      const ids = itemIdsInSheet(csv);
      if (ids.length) return ids;
    } catch {
      /* fall through */
    }
  }
  const local = await loadLocalStore();
  const ids = localItemIds(local);
  if (ids.length) return ids;
  return ITEMS.map((i) => i.id);
}

app.get("/api/sheet", async (req, res) => {
  try {
    const period = parsePeriod(req.query.period);
    const itemCode = String(req.query.itemCode || "sangchu");
    const item = findItemById(itemCode);
    if (!item) {
      res.status(400).json({ error: "UNKNOWN_ITEM", message: "알 수 없는 품목입니다." });
      return;
    }

    const availableIds = await resolveAvailableItemIds();

    // 1) Google Sheet
    if (SHEET_CSV_URL) {
      try {
        const csv = await fetchSheetCsv(SHEET_CSV_URL);
        const available = itemIdsInSheet(csv);
        const bundle = parseSheetCsvForItem(csv, item);
        if (bundle.dailies.length === 0) {
          res.status(404).json({
            error: "NO_ROWS",
            message: `${item.name} 시세가 시트에 없습니다. 품목을 추가해 주세요.`,
            availableItemIds: available,
          });
          return;
        }
        return res.json({
          ...buildSheetPayload(item, period, bundle.dailies, bundle.monthlies, "sheet"),
          availableItemIds: available,
        });
      } catch (e) {
        const code = (e as { code?: string }).code;
        if (code === "SHEET_LOGIN") {
          res.status(502).json({
            error: "SHEET_LOGIN",
            message: "시트 CSV가 로그인 페이지를 반환했습니다. 공유를 '링크 있는 사용자 뷰어'로 열어 주세요.",
          });
          return;
        }
        throw e;
      }
    }

    // 2) Local JSON store
    const local = await loadLocalStore();
    const localRows = local.dailies.filter((d) => d.itemCode === item.id);
    if (localRows.length) {
      return res.json({
        ...buildSheetPayload(
          item,
          period,
          localRows.map((r) => ({
            date: r.date,
            itemCode: r.itemCode,
            itemName: r.itemName,
            price: r.price,
            unit: r.unit,
            trend: r.trend,
            aiSummary: r.aiSummary,
            buyAction: r.buyAction,
            collectedAt: r.collectedAt,
          })),
          [],
          "local",
        ),
        availableItemIds: localItemIds(local),
      });
    }

    // 3) Public data portal direct (no sheet)
    if (DATA_GO_KR_SERVICE_KEY) {
      const { start, end } = periodRange(period);
      const trades = await fetchPublicDaily({
        serviceKey: DATA_GO_KR_SERVICE_KEY,
        item,
        start,
        end,
      });
      const series = filterPeriod(trades, period);
      const points = series.points;
      const selected = lastTradeDate(points);
      return res.json({
        source: "public",
        item: {
          id: item.id,
          name: item.name,
          kindName: item.kindName,
          unit: item.unit,
          note: item.note ?? null,
        },
        period,
        rangeLabel: formatDotRange(series.start, series.end),
        start: series.start,
        end: series.end,
        points: points.map((p) => ({
          date: p.date,
          price: p.price,
          filled: p.filled,
          md: `${p.date.slice(5, 7)}.${p.date.slice(8, 10)}`,
          weekday: weekdayKo(p.date),
        })),
        monthlies: [],
        tradeDays: points.filter((p) => !p.filled && p.raw != null).length,
        selectedDate: selected,
        selectedLabel: selected ? formatKoLong(selected) : null,
        detail: selected ? detailFromPoints(points, selected, "", "", "") : null,
        availableItemIds: availableIds,
        compareYearNote:
          "공공데이터포털 일별 도매가(중도매·상품) 시장 단순 평균입니다. kg 환산가는 쓰지 않습니다.",
      });
    }

    res.status(503).json({
      error: "MISSING_SHEET",
      message:
        "구글 시트를 연결해 주세요. 서버 .env.local에 SHEET_CSV_URL을 넣거나, DATA_GO_KR_SERVICE_KEY로 일별 API를 연결하세요.",
      availableItemIds: [],
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "SERVER", message: "시트 조회에 실패했습니다." });
  }
});

function detailFromPoints(
  points: { date: string; price: number | null; filled: boolean; raw: number | null }[],
  date: string,
  trend: string,
  aiSummary: string,
  buyAction: string,
) {
  const row = points.find((p) => p.date === date);
  const ch = dayChange(points, date);
  return {
    date,
    label: formatKoLong(date),
    isTradingDay: Boolean(row && !row.filled && row.raw != null),
    price: row?.price ?? null,
    change: ch,
    trend: trend || null,
    aiSummary: aiSummary || null,
    buyAction: buyAction || null,
  };
}

function buildSheetPayload(
  item: ItemDef,
  period: Period,
  dailies: {
    date: string;
    price: number;
    trend: string;
    aiSummary: string;
    buyAction: string;
    unit: string;
  }[],
  monthlies: { date: string; price: number }[],
  source: string,
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
    item: {
      id: item.id,
      name: item.name,
      kindName: item.kindName,
      unit: dailies[0]?.unit || item.unit,
      note: item.note ?? null,
    },
    period,
    rangeLabel: formatDotRange(series.start, series.end),
    start: series.start,
    end: series.end,
    points: series.points.map((p) => ({
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
      ? detailFromPoints(
          series.points,
          selected,
          m?.trend ?? "",
          m?.aiSummary ?? "",
          m?.buyAction ?? "",
        )
      : null,
    metaByDate: Object.fromEntries(meta),
    compareYearNote: null as string | null,
  };
}

/** Live KAMIS proxy — mid-grade pair, optional YoY note */
app.get("/api/kamis", async (req, res) => {
  try {
    if (!KAMIS_CERT_KEY || !KAMIS_CERT_ID) {
      res.status(503).json({
        error: "MISSING_KAMIS",
        message:
          "KAMIS 인증키가 없습니다. .env.local에 KAMIS_CERT_KEY, KAMIS_CERT_ID를 넣어 주세요.",
      });
      return;
    }
    const period = parsePeriod(req.query.period) === "2y" ? "6m" : parsePeriod(req.query.period);
    const itemCode = String(req.query.itemCode || "sangchu");
    const compareYear = String(req.query.compareYear || "0") === "1";
    const item = findItemById(itemCode);
    if (!item) {
      res.status(400).json({ error: "UNKNOWN_ITEM" });
      return;
    }
    const { start, end } = periodRange(period);
    const [good, mid] = await Promise.all([
      fetchPeriodProductList({
        certKey: KAMIS_CERT_KEY,
        certId: KAMIS_CERT_ID,
        item,
        start,
        end,
        gradeCode: "04",
      }),
      fetchPeriodProductList({
        certKey: KAMIS_CERT_KEY,
        certId: KAMIS_CERT_ID,
        item,
        start,
        end,
        gradeCode: "05",
      }),
    ]);

    let compareNote: string | null = null;
    let comparePoints: { date: string; price: number | null; filled: boolean }[] = [];
    if (compareYear) {
      const cEnd = formatYmd(addDays(seoulToday(), -1 - 365));
      const cStart =
        period === "1m"
          ? formatYmd(addDays(seoulToday(), -1 - 365 - 30))
          : formatYmd(addDays(seoulToday(), -1 - 365 - 180));
      const prev = await fetchPeriodProductList({
        certKey: KAMIS_CERT_KEY,
        certId: KAMIS_CERT_ID,
        item,
        start: cStart,
        end: cEnd,
        gradeCode: "04",
      });
      if (prev.size === 0) {
        compareNote =
          "전년 같은 구간 일별이 KAMIS 보관 시작일보다 앞이거나 비어 비교 선이 없습니다.";
      } else {
        compareNote = "전년 비교는 안내만 표시합니다. 점선 시리즈는 데이터가 있을 때만 그립니다.";
        const shifted = new Map<string, number>();
        for (const [d, p] of prev) {
          const nd = formatYmd(addDays(new Date(`${d}T00:00:00Z`), 365));
          if (nd >= start && nd <= end) shifted.set(nd, p);
        }
        comparePoints = filterPeriod(shifted, period).points;
      }
    }

    const series = filterPeriod(good, period);
    const midSeries = filterPeriod(mid, period);
    const selected = lastTradeDate(series.points);
    const midAt = selected
      ? midSeries.points.find((p) => p.date === selected)?.price ?? null
      : null;

    res.json({
      source: "kamis",
      item: {
        id: item.id,
        name: item.name,
        kindName: item.kindName,
        unit: item.unit,
        note: item.note ?? null,
      },
      period,
      rangeLabel: formatDotRange(series.start, series.end),
      points: series.points.map((p) => ({
        date: p.date,
        price: p.price,
        filled: p.filled,
        midPrice: midSeries.points.find((m) => m.date === p.date)?.price ?? null,
        md: `${p.date.slice(5, 7)}.${p.date.slice(8, 10)}`,
        weekday: weekdayKo(p.date),
      })),
      comparePoints,
      compareNote,
      selectedDate: selected,
      detail: selected
        ? {
            ...detailFromPoints(series.points, selected, "", "", ""),
            midPrice: midAt,
          }
        : null,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "KAMIS_FAIL", message: "KAMIS 조회에 실패했습니다." });
  }
});

app.get("/api/sheet/detail", async (req, res) => {
  // lightweight: client already has metaByDate; keep for completeness
  res.status(404).json({ error: "USE_CLIENT_META" });
});

app.post("/api/items", async (req, res) => {
  try {
    const rawName = String(req.body?.itemName || req.body?.name || "").trim();
    const item =
      findItemByName(rawName) ||
      (req.body?.itemCode ? findItemById(String(req.body.itemCode)) : null);

    if (!item) {
      res.status(400).json({
        error: "UNKNOWN_ITEM",
        message: `등록된 품목만 추가할 수 있습니다: ${allowedItemNames().join(", ")}`,
      });
      return;
    }

    // Prefer GAS when configured
    if (GAS_WEBAPP_URL) {
      const payload = {
        itemCode: item.id,
        itemName: item.name,
        categoryCode: item.categoryCode,
        kamisItemCode: item.itemCode,
        kindCode: item.kindCode,
        kindName: item.kindName,
        unit: item.unit,
        gradeCode: item.gradeCode,
        token: GAS_APP_TOKEN || undefined,
      };
      const postRes = await fetch(GAS_WEBAPP_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        redirect: "manual",
      });
      let bodyText = await postRes.text();
      const loc = postRes.headers.get("location");
      if ((postRes.status === 302 || postRes.status === 303) && loc) {
        const follow = await fetch(loc, { method: "GET" });
        bodyText = await follow.text();
      }
      let parsed: unknown = null;
      try {
        parsed = JSON.parse(bodyText);
      } catch {
        parsed = { raw: bodyText.slice(0, 500) };
      }
      res.json({ ok: true, via: "gas", item: { id: item.id, name: item.name }, result: parsed });
      return;
    }

    // Local collection via public API
    if (!DATA_GO_KR_SERVICE_KEY) {
      res.status(503).json({
        error: "MISSING_GAS",
        message:
          "Apps Script 주소가 없습니다. .env.local에 GAS_WEBAPP_URL을 넣거나, DATA_GO_KR_SERVICE_KEY로 로컬 수집을 켜 주세요.",
      });
      return;
    }

    const end = formatYmd(addDays(seoulToday(), -1));
    const chunks = twoYearChunks(end);
    const trades = new Map<string, number>();
    for (const chunk of chunks) {
      const part = await fetchPublicDaily({
        serviceKey: DATA_GO_KR_SERVICE_KEY,
        item,
        start: chunk.start,
        end: chunk.end,
      });
      for (const [d, p] of part) trades.set(d, p);
    }

    const sorted = [...trades.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, price]) => ({ date, price }));

    let aiSummary = "";
    let buyAction = "";
    let warn: string | null = null;
    try {
      const recent = sorted.slice(-30);
      let changePct30: number | null = null;
      if (recent.length >= 2) {
        const a = recent[0].price;
        const b = recent[recent.length - 1].price;
        changePct30 = a === 0 ? null : ((b - a) / a) * 100;
      }
      const fc = await forecastBuyTiming({
        apiKey: GEMINI_API_KEY,
        model: GEMINI_MODEL,
        itemName: item.name,
        unit: item.unit,
        recentPrices: recent,
        changePct30,
        trends: [],
      });
      if (fc) {
        aiSummary = fc.summary;
        buyAction = fc.action;
      } else if (!GEMINI_API_KEY) {
        warn = "Gemini 키가 없어 시세만 저장했습니다.";
      }
    } catch (e) {
      warn = `예측 실패: ${(e as Error).message}`;
    }

    const now = new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
    const rows = sorted.map((r, i, arr) => ({
      date: r.date,
      price: r.price,
      trend: "",
      aiSummary: i === arr.length - 1 ? aiSummary : "",
      buyAction: i === arr.length - 1 ? buyAction : "",
      collectedAt: now,
    }));
    await upsertLocalItem(item, rows);

    res.json({
      ok: true,
      via: "local",
      item: { id: item.id, name: item.name },
      days: sorted.length,
      latest: sorted[sorted.length - 1] ?? null,
      buyAction: buyAction || null,
      warn,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "ITEMS_FAIL", message: "품목 추가에 실패했습니다." });
  }
});

const dist = path.join(root, "dist");
app.use(express.static(dist));

app.listen(PORT, () => {
  console.log(`[kamis] API http://127.0.0.1:${PORT}`);
});
