type Props = {
  action: string | null;
  summary: string | null;
};

function tone(action: string | null) {
  switch (action) {
    case "적극 매입":
      return "border-emerald-300 bg-emerald-50 text-emerald-800";
    case "소량 분할 매입":
      return "border-amber-300 bg-amber-50 text-amber-800";
    case "매입 보류":
      return "border-blue-300 bg-blue-50 text-blue-800";
    default:
      return "border-stone-300 bg-stone-50 text-stone-700";
  }
}

export function AiCard({ action, summary }: Props) {
  return (
    <section className={`rounded-[18px] border-2 p-4 shadow-card ${tone(action)}`}>
      <p className="text-xs opacity-80">AI 매입 타이밍 · 향후 10~20일</p>
      {action ? <h2 className="mt-1.5 text-[1.35rem] font-extrabold">{action}</h2> : null}
      {summary ? <p className="mt-2 text-sm leading-relaxed text-stone-800">{summary}</p> : null}
      {!action && !summary ? (
        <p className="mt-2 text-sm text-stone-500">이 날짜에 저장된 예측이 없습니다.</p>
      ) : null}
    </section>
  );
}
