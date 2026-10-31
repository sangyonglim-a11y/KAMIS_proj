type Props = {
  sourceLabel: string;
  onAdd: () => void;
};

export function Header({ sourceLabel, onAdd }: Props) {
  return (
    <header className="hero">
      <div className="hero-inner">
        <div className="hero-text">
          <p className="hero-kicker">{sourceLabel}</p>
          <h1 className="hero-title">도매 시세와 매입 타이밍</h1>
          <p className="hero-desc desktop-only">
            품목과 기간을 고르면 일별 도매가와 10~20일 매입 안내를 봅니다. 주말·공휴일은
            직전 거래가로 이어 그립니다.
          </p>
        </div>
        <button type="button" className="add-btn" onClick={onAdd}>
          <span className="add-plus" aria-hidden>
            +
          </span>
          <span className="add-label-full">신규 품목 추가</span>
          <span className="add-label-short">품목</span>
        </button>
      </div>
    </header>
  );
}
