import { NextRequest, NextResponse } from "next/server";
import {
  findItemByName,
  slugifyMeatName,
  type Category,
  type MeatGroup,
} from "@/lib/catalog";
import { postToGas } from "@/lib/gas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      category?: Category;
      itemName?: string;
      itemCode?: string;
      meatGroup?: MeatGroup;
      origin?: string;
      brand?: string;
      part?: string;
      searchKeyword?: string;
      productUrl?: string;
      unit?: string;
    };

    const category: Category = body.category === "meat" ? "meat" : "veg";

    if (category === "veg") {
      const known = findItemByName(String(body.itemName || ""), "veg");
      if (!known && !body.itemCode) {
        return NextResponse.json(
          {
            error: "UNKNOWN_ITEM",
            message: "등록된 채소 품목명 또는 itemCode가 필요합니다.",
          },
          { status: 400 },
        );
      }
      const result = await postToGas({
        action: "addItem",
        category: "veg",
        itemCode: known?.id || body.itemCode,
        itemName: known?.name || body.itemName,
        unit: known?.unit || body.unit,
        kindName: known?.kindName,
        categoryCode: known?.categoryCode,
        kamisItemCode: known?.itemCode,
        kindCode: known?.kindCode,
      });
      return NextResponse.json({ ok: true, via: "gas", category, result });
    }

    const name = String(body.itemName || body.part || "").trim();
    if (!name) {
      return NextResponse.json(
        { error: "MISSING_NAME", message: "부위명(또는 품목명)을 입력하세요." },
        { status: 400 },
      );
    }
    if (!body.meatGroup) {
      return NextResponse.json(
        {
          error: "MISSING_GROUP",
          message: "분류(수입소/수입돼지/국산소/국산돼지)를 선택하세요.",
        },
        { status: 400 },
      );
    }

    const preset = findItemByName(name, "meat");
    const payload = {
      action: "addItem",
      category: "meat",
      itemCode: preset?.id || body.itemCode || slugifyMeatName(name),
      itemName: preset?.name || name,
      meatGroup: body.meatGroup,
      origin: body.origin || preset?.origin || "",
      brand: body.brand || preset?.brand || "",
      part: body.part || preset?.part || name,
      searchKeyword: body.searchKeyword || preset?.searchKeyword || name,
      productUrl: body.productUrl || "",
      unit: body.unit || "kg",
    };

    const result = await postToGas(payload);
    return NextResponse.json({ ok: true, via: "gas", category: "meat", item: payload, result });
  } catch (e) {
    const err = e as { code?: string; status?: number; message?: string };
    console.error(e);
    return NextResponse.json(
      { error: err.code || "ITEMS_FAIL", message: err.message || "품목 추가에 실패했습니다." },
      { status: err.status || 500 },
    );
  }
}
