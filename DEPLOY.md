# Vercel 배포 가이드 (Next.js 14)

## 사전 준비

1. 구글 시트에 탭 `야채시세`, `육류시세`, `품목` 생성  
2. Apps Script에 `apps-script/DataPipeline.gs` 붙여넣기 → `setup()` 실행  
3. 스크립트 속성: `GEMINI_API_KEY`, (선택) `APP_TOKEN`, `GEMINI_MODEL`  
4. 웹 앱 배포: 실행 주체 **나**, 액세스 **모든 사용자** → `/exec` URL 복사  
5. 시트 공유: 링크 있는 사용자 **뷰어**  
6. CSV URL 형식:

```
https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?tqx=out:csv&sheet=야채시세
https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?tqx=out:csv&sheet=육류시세
```

## 로컬

```bash
cp .env.example .env.local
# VEG_SHEET_CSV_URL, MEAT_SHEET_CSV_URL, GAS_WEBAPP_URL, GEMINI_API_KEY 채우기
npm install
npm run dev
```

## GitHub → Vercel 3단계

```bash
# 1) 커밋 & 푸시
git add -A
git commit -m "Add Next.js veg/meat AI dashboard and Apps Script pipeline"
git push -u origin main

# 2) Vercel 프로젝트 연결 (최초 1회)
npx vercel login
npx vercel link

# 3) 환경변수 등록 후 프로덕션 배포
npx vercel env add VEG_SHEET_CSV_URL
npx vercel env add MEAT_SHEET_CSV_URL
npx vercel env add GAS_WEBAPP_URL
npx vercel env add GAS_APP_TOKEN
npx vercel env add GEMINI_API_KEY
npx vercel --prod
```

GitHub 연동만 쓰면 Vercel 대시보드에서 Import → Framework **Next.js** → 위 환경변수 입력 → Deploy.

## Apps Script 일일 수집

편집기에서 `installDailyTrigger()` 실행 → 매일 7시 `collectDaily` (육류 B2B 검색가 + Gemini).

HTML 구조가 바뀌면 `fetchMeatPrices` / `extractWonPrices_` 정규식을 조정하고, 품목별 `상품URL`을 시트에 넣으면 검색 대신 해당 페이지를 봅니다.
