import { NextRequest, NextResponse } from "next/server";
import { findItemById, itemsByCategory, type Category } from "@/lib/catalog";
import {
  buildSheetPayload,
  csvUrlForCategory,
  fetchSheetCsv,
  itemIdsInSheet,
  parseSheetCsvForItem,
} from "@/lib/sheet";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Period = "1m" | "6m" | "2y";

function parsePeriod(raw: string | null): Period {
  if (raw === "6m" || raw === "2y" || raw === "1m") return raw;
  return "1m";
}

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const category = (sp.get("category") === "meat" ? "meat" : "veg") as Category;
    const period = parsePeriod(sp.get("period"));
    const defaultId = category === "meat" ? "us-hwangje-galbisal" : "sangchu";
    const itemCode = sp.get("itemCode") || defaultId;
    const item = findItemById(itemCode);

    if (!item || item.category !== category) {
      return NextResponse.json(
        { error: "UNKNOWN_ITEM", message: "알 수 없는 품목입니다." },
        { status: 400 },
      );
    }

    const csvUrl = csvUrlForCategory(category);
    if (!csvUrl) {
      return NextResponse.json(
        {
          error: "MISSING_SHEET",
          message:
            category === "meat"
              ? "육류시세 시트를 연결해 주세요. MEAT_SHEET_CSV_URL을 설정하세요."
              : "야채시세 시트를 연결해 주세요. VEG_SHEET_CSV_URL 또는 SHEET_CSV_URL을 설정하세요.",
          availableItemIds: itemsByCategory(category).map((i) => i.id),
        },
        { status: 503 },
      );
    }

    const csv = await fetchSheetCsv(csvUrl);
    const available = itemIdsInSheet(csv, category);
    const bundle = parseSheetCsvForItem(csv, item);

    if (!bundle.dailies.length) {
      return NextResponse.json(
        {
          error: "NO_ROWS",
          message: `${item.name} 시세가 시트에 없습니다. 품목을 추가하거나 일일 수집을 실행하세요.`,
          availableItemIds: available.length ? available : itemsByCategory(category).map((i) => i.id),
        },
        { status: 404 },
      );
    }

    return NextResponse.json(
      buildSheetPayload(item, period, bundle.dailies, bundle.monthlies, "sheet", available),
    );
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === "SHEET_LOGIN") {
      return NextResponse.json(
        {
          error: "SHEET_LOGIN",
          message: "시트 CSV가 로그인 페이지를 반환했습니다. 공유를 뷰어로 열어 주세요.",
        },
        { status: 502 },
      );
    }
    console.error(e);
    return NextResponse.json(
      { error: "SERVER", message: "시트 조회에 실패했습니다." },
      { status: 500 },
    );
  }
}
