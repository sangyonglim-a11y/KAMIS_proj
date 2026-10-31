# KAMIS 도매 시세 대시보드

Vite + React 프론트와 Express API로 재구축한 도매가·매입 타이밍 대시보드입니다. 구글 시트 CSV를 기본으로 읽고, 없으면 공공데이터포털 일별 API·로컬 JSON·KAMIS 실시간 프록시를 씁니다.

## 실행

```bash
npm install
cp .env.example .env.local   # 이미 있으면 키만 채움
npm run dev
```

- 웹: http://127.0.0.1:5173 (Vite, `/api` → 3001 프록시)
- API: http://127.0.0.1:3001

## Vercel

Express는 `api/index.ts` 서버리스 함수로 배포됩니다. `vercel.json`이 `/api/*`를 그 함수로 rewrite합니다.

프로젝트 환경 변수에 로컬과 동일하게 `SHEET_CSV_URL` 등을 넣으세요 (`.env.local`은 커밋되지 않음).

## 환경 변수 (서버 전용)

| 변수 | 역할 |
| --- | --- |
| `SHEET_CSV_URL` | 시세 탭 CSV (우선) |
| `GAS_WEBAPP_URL` / `GAS_APP_TOKEN` | 품목 추가 → Apps Script |
| `DATA_GO_KR_SERVICE_KEY` | 시트 없을 때 일별 조회·로컬 2년 수집 |
| `KAMIS_CERT_KEY` / `KAMIS_CERT_ID` | `/api/kamis` 실시간 |
| `GEMINI_API_KEY` | 로컬 수집 시 매입 문장 |

키는 클라이언트 번들에 넣지 않습니다.

## API

- `GET /api/sheet?itemCode=&period=1m|6m|2y`
- `POST /api/items` `{ "itemName": "양파" }`
- `GET /api/kamis?itemCode=&period=1m|6m&compareYear=0|1`
- `GET /api/catalog`, `GET /api/health`
