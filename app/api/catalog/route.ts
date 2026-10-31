import { NextResponse } from "next/server";
import { MEAT_GROUP_LABEL, MEAT_ITEMS, VEG_ITEMS } from "@/lib/catalog";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    veg: VEG_ITEMS.map((it) => ({
      id: it.id,
      name: it.name,
      unit: it.unit,
      kindName: it.kindName ?? null,
    })),
    meat: MEAT_ITEMS.map((it) => ({
      id: it.id,
      name: it.name,
      unit: it.unit,
      meatGroup: it.meatGroup,
      meatGroupLabel: it.meatGroup ? MEAT_GROUP_LABEL[it.meatGroup] : null,
      origin: it.origin,
      brand: it.brand,
      part: it.part,
    })),
    meatGroups: MEAT_GROUP_LABEL,
  });
}
