type Props = {
  message: string;
};

export function EmptyState({ message }: Props) {
  return (
    <section className="card empty-card">
      <h2>구글 시트를 연결해 주세요</h2>
      <p>{message}</p>
      <ol>
        <li>
          <code>.env.example</code>을 <code>.env.local</code>로 복사합니다.
        </li>
        <li>
          <code>SHEET_CSV_URL</code>에 시세 탭 CSV 주소를 넣거나,{" "}
          <code>DATA_GO_KR_SERVICE_KEY</code>로 일별 API를 연결합니다.
        </li>
        <li>
          서버를 다시 시작한 뒤 품목을 고르거나 <strong>+ 품목</strong>으로 수집합니다.
        </li>
      </ol>
    </section>
  );
}
