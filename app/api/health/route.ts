import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    vegSheet: Boolean(process.env.VEG_SHEET_CSV_URL || process.env.SHEET_CSV_URL),
    meatSheet: Boolean(process.env.MEAT_SHEET_CSV_URL),
    gas: Boolean(process.env.GAS_WEBAPP_URL),
    gemini: Boolean(process.env.GEMINI_API_KEY),
  });
}
