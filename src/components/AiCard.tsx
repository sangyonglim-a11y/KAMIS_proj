type Props = {
  action: string | null;
  summary: string | null;
};

function tone(action: string | null): string {
  switch (action) {
    case "적극 매입":
      return "tone-buy";
    case "소량 분할 매입":
      return "tone-split";
    case "매입 보류":
      return "tone-hold";
    case "관망":
      return "tone-wait";
    default:
      return "tone-wait";
  }
}

export function AiCard({ action, summary }: Props) {
  if (!action && !summary) {
    return (
      <section className={`card ai-card ${tone(null)}`}>
        <p className="ai-kicker">AI 매입 타이밍 · 향후 10~20일</p>
        <p className="muted">이 날짜에 저장된 예측이 없습니다.</p>
      </section>
    );
  }

  return (
    <section className={`card ai-card ${tone(action)}`}>
      <p className="ai-kicker">AI 매입 타이밍 · 향후 10~20일</p>
      {action ? <h2 className="ai-action">{action}</h2> : null}
      {summary ? <p className="ai-summary">{summary}</p> : null}
    </section>
  );
}
