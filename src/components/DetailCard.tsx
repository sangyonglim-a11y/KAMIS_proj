import type { Detail } from "../types";

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
      <section className="card detail-card">
        <p className="muted">선택한 날짜의 시세가 없습니다.</p>
      </section>
    );
  }

  const ch = detail.change;
  const down = ch != null && ch.delta < 0;
  const up = ch != null && ch.delta > 0;

  return (
    <section className="card detail-card">
      <div className="detail-top">
        <div>
          <p className="detail-kicker">선택한 날짜</p>
          <div className="detail-date-row">
            <h2>{detail.label}</h2>
            <span className={`badge${detail.isTradingDay ? " is-trade" : " is-closed"}`}>
              {detail.isTradingDay ? "거래일" : "휴장"}
            </span>
          </div>
          <p className="muted">{itemLabel}</p>
        </div>
      </div>

      <div className="detail-metrics">
        <div>
          <p className="metric-label">도매가 (상품)</p>
          <p className="metric-price">
            {detail.price != null ? won(detail.price) : "—"}
          </p>
          {!detail.isTradingDay && detail.price != null ? (
            <p className="muted tiny">직전 거래가 기준</p>
          ) : null}
        </div>
        <div>
          <p className="metric-label">전일 대비</p>
          {ch ? (
            <p className={`metric-change${down ? " is-down" : ""}${up ? " is-up" : ""}`}>
              {down ? "▼" : up ? "▲" : "–"} {Math.abs(ch.delta).toLocaleString("ko-KR")}원 (
              {Math.abs(ch.pct).toFixed(1)}%)
            </p>
          ) : (
            <p className="muted">—</p>
          )}
        </div>
      </div>

      <div className="trend-box">
        <p className="metric-label">거래동향</p>
        {detail.trend ? (
          <ul className="trend-list">
            {detail.trend
              .split(/\n|·|●/)
              .map((t) => t.trim())
              .filter(Boolean)
              .map((t, i) => (
                <li key={`${i}-${t.slice(0, 24)}`}>{t}</li>
              ))}
          </ul>
        ) : (
          <p className="muted">이 날짜에 저장된 KAMIS 거래동향이 없습니다.</p>
        )}
      </div>
    </section>
  );
}
