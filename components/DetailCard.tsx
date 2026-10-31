import type { Detail } from "@/lib/types";

type Props = {
  detail: Detail | null;
  itemLabel: string;
};

function won(n: number) {
  return `${n.toLocaleString("ko-KR")}원`;
}

export function DetailCard({ detail, itemLabel }: Props) {
  if (!detail) {
    return (
      <section className="rounded-[18px] border border-paper-line bg-paper-card p-4 shadow-card">
        <p className="text-sm text-stone-500">선택한 날짜의 시세가 없습니다.</p>
      </section>
    );
  }

  const ch = detail.change;
  const down = ch != null && ch.delta < 0;
  const up = ch != null && ch.delta > 0;

  return (
    <section className="rounded-[18px] border border-paper-line bg-paper-card p-4 shadow-card">
      <p className="text-xs text-stone-500">선택한 날짜</p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-bold">{detail.label}</h2>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
            detail.isTradingDay
              ? "bg-forest-soft text-forest"
              : "bg-stone-100 text-stone-600"
          }`}
        >
          {detail.isTradingDay ? "거래일" : "휴장"}
        </span>
      </div>
      <p className="mt-1 text-sm text-stone-500">{itemLabel}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-xs text-stone-500">도매가</p>
          <p className="mt-1 text-[clamp(1.6rem,5vw,2rem)] font-extrabold tracking-tight">
            {detail.price != null ? won(detail.price) : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-stone-500">전일 대비</p>
          {ch ? (
            <p
              className={`mt-1.5 text-lg font-bold ${
                down ? "text-blue-700" : up ? "text-red-700" : "text-stone-700"
              }`}
            >
              {down ? "▼" : up ? "▲" : "–"} {Math.abs(ch.delta).toLocaleString("ko-KR")}원 (
              {Math.abs(ch.pct).toFixed(1)}%)
            </p>
          ) : (
            <p className="mt-1.5 text-stone-500">—</p>
          )}
        </div>
      </div>

      <div className="mt-4 border-t border-paper-line pt-3.5">
        <p className="text-xs text-stone-500">거래동향 / 수집 메모</p>
        {detail.trend ? (
          <ul className="mt-2 list-disc space-y-1 pl-4 text-sm leading-relaxed">
            {detail.trend
              .split(/\n|·|●/)
              .map((t) => t.trim())
              .filter(Boolean)
              .map((t, i) => (
                <li key={`${i}-${t.slice(0, 24)}`}>{t}</li>
              ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-stone-500">이 날짜에 저장된 동향이 없습니다.</p>
        )}
      </div>
    </section>
  );
}
