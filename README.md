# gogiparty — 야채·육류 도매 시세 AI 예측

Next.js 14 (App Router) + Tailwind + Recharts 대시보드.  
구글 시트(`야채시세` / `육류시세`) + Apps Script(`DataPipeline.gs`) + Gemini로 10~20일 매입 타이밍을 표시합니다.

## 빠른 시작

```bash
npm install
cp .env.example .env.local
npm run dev
```

- 앱: http://localhost:3000  
- API: `/api/sheet`, `/api/items`, `/api/catalog`, `/api/health`

## 구성

| 경로 | 역할 |
| --- | --- |
| `app/` | Next.js UI · Route Handlers |
| `components/` | 탭·차트·모달·AI 카드 |
| `lib/` | 카탈로그·시트 CSV·GAS 클라이언트 |
| `apps-script/DataPipeline.gs` | 육류 크롤·Gemini·시트 적재 |

초기 육류 10종은 `lib/catalog.ts` / `DataPipeline.gs` 에 동일하게 정의되어 있습니다.

배포는 [DEPLOY.md](./DEPLOY.md) 참고.
