import type { BuyAction } from "./catalog.js";
import { BUY_ACTIONS } from "./catalog.js";

export type ForecastResult = {
  summary: string;
  action: BuyAction;
};

export async function forecastBuyTiming(opts: {
  apiKey: string;
  model: string;
  itemName: string;
  unit: string;
  recentPrices: { date: string; price: number }[];
  changePct30?: number | null;
  trends: string[];
}): Promise<ForecastResult | null> {
  const { apiKey, model, itemName, unit, recentPrices, changePct30, trends } = opts;
  if (!apiKey) return null;

  const priceLines = recentPrices
    .slice(-30)
    .map((p) => `${p.date}: ${p.price}`)
    .join("\n");
  const trendText = trends.filter(Boolean).slice(0, 12).join("\n") || "(없음)";

  const prompt = `당신은 한국 농산물 도매 매입 조언을 합니다.
품목: ${itemName} (${unit})
최근 30거래일 도매가(원):
${priceLines}
최근 30일 변동률(%): ${changePct30 ?? "n/a"}
일자별 KAMIS 거래동향 (소매·중도매, 날짜별):
${trendText}

향후 10~20일 흐름과 지금 살지 2주 미룰지를 3문장 이내로 요약하세요.
반드시 JSON만 출력: {"summary":"...","action":"적극 매입|관망|소량 분할 매입|매입 보류"}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4 },
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw Object.assign(new Error(`Gemini ${res.status}: ${t.slice(0, 200)}`), {
      code: "GEMINI_HTTP",
    });
  }
  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]) as { summary?: string; action?: string };
    const action = BUY_ACTIONS.includes(parsed.action as BuyAction)
      ? (parsed.action as BuyAction)
      : "관망";
    return { summary: (parsed.summary ?? "").trim().slice(0, 600), action };
  } catch {
    return null;
  }
}
