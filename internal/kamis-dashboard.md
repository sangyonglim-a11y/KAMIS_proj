---
cursor:
  subagentId: "bc-ddeed160-a0a7-5d11-bd56-fd45d46b4f06"
---

# KAMIS 도매 시세 대시보드

프로젝트 경로: `/home/ubuntu/kamis-dashboard` (`~/kamis-dashboard`). 브랜치 `cursor/kamis-wholesale-dashboard-4f06`, 커밋 `e0909cd`. 원격이 없어 push와 PR은 하지 않았다.

시트 적재와 Gemini 10~20일 매입 예측은 `internal/kamis-forecast.md`에 있다.

## 실행

```bash
cd ~/kamis-dashboard
npm install
cp .env.example .env.local   # KAMIS_CERT_KEY, KAMIS_CERT_ID
npm run dev                  # http://localhost:3000
```

키를 바꾼 뒤에는 개발 서버를 다시 시작한다. 키가 없으면 차트 대신 `.env.local` 안내만 나오고, 가격을 만들지 않는다.

로컬 확인용 `.env.local`에는 KAMIS Open API 안내 샘플 URL에 있는 값(`p_cert_key=111`, `p_cert_id=222`)만 넣었다. gitignore 대상이다. 본인 키로 바꾸는 것이 맞다.

## 코드표

출처: [productInfo](https://www.kamis.or.kr/service/price/xml.do?action=productInfo&p_returntype=json) (안내 [board 15](https://www.kamis.or.kr/customer/reference/openapi_list.do?action=detail&boardno=15)). 단위와 등급은 2026-10-28 `dailyPriceByCategoryList` (`p_product_cls_code=02`)와 대조했다. 도매만, `p_convert_kg_yn=N`. 등급 기본 04 상품, 중품 05.

| 품목 | 부류 | 품목코드 | 품종 | 품종코드 | 등급 | 단위 |
| --- | --- | --- | --- | --- | --- | --- |
| 상추 | 200 | 214 | 청 | 02 | 04 / 05 | 4kg |
| 깻잎 | 200 | 253 | 깻잎 | 00 | 04 / 05 | 2kg |
| 양파 | 200 | 245 | 양파 | 00 | 04 / 05 | 15kg |
| 무 | 200 | 231 | 전체 | (조건 없음) | 04 / 05 | 20kg |
| 대파 | 200 | 246 | 대파 | 00 | 04 / 05 | 1kg |
| 마늘 | 200 | 258 | 깐마늘(대서) | 03 | 04 / 05 | 20kg |
| 청양고추 | 200 | 242 | 청양고추 | 03 | 04 / 05 | 10kg |
| 배추 | 200 | 211 | 가을 | 03 | 04 / 05 | 10kg(그물망 3포기) |
| 오이 | 200 | 223 | 다다기계통 | 02 | 04 / 05 | 50개 |
| 감자 | 100 | 152 | 수미(노지) | 01 | 04 / 05 | 20kg |
| 양배추 | 200 | 212 | 양배추 | 00 | 04 / 05 | 8kg |
| 청오이 | 200 | 223 | 취청 | 03 | 04 / 05 | 50개 |
| 팽이버섯 | 300 | 316 | 팽이버섯 | 00 | 04 / 05 | 5kg |
| 새송이버섯 | 300 | 317 | 새송이버섯 | 00 | 04 / 05 | 2kg |
| 주키니호박 | 200 | 224 | 쥬키니 | 02 | 04 / 05 | 10kg |
| 애호박 | 200 | 224 | 애호박 | 01 | 04 / 05 | 20개 |

깐마늘(대서)는 productInfo의 `whole_productrankcode`가 비어 있었다. 일별·기간 API가 상품 04 / 중품 05 가격을 줘서 그 등급을 썼다. 추측으로 채운 코드는 없다.

## API

- 액션: `periodProductList` ([안내 board 2](https://www.kamis.or.kr/customer/reference/openapi_list.do?action=detail&boardno=2))
- URL: `https://www.kamis.or.kr/service/price/xml.do`
- 파라미터: `p_cert_key`, `p_cert_id`, `p_returntype=json`, `p_startday`, `p_endday`, `p_productclscode=02`, `p_itemcategorycode`, `p_itemcode`, `p_kindcode`, `p_productrankcode`, `p_countrycode=`(빈 값), `p_convert_kg_yn=N`
- 응답에서 쓰는 필드: `data.error_code`, `data.item[]`의 `countyname`, `yyyy`, `regday`(`MM/DD`), `price`. 가격의 쉼표와 `-`를 숫자/결측으로 파싱한다.
- 지역: 빈 `p_countrycode`가 주는 `countyname=평균`만 쓴다. `평년`은 전년이 아니라서 버린다. 요청 구간 밖 날짜도 버린다. KAMIS가 범위 밖 요청을 최근 1년 전체로 바꿔 돌려주는 경우가 있다.
- 프록시: `GET /api/kamis?itemCode=&period=1m|6m&compareYear=0|1`. 키는 응답에 넣지 않는다.
- 종료일은 서울 기준 어제. 1개월은 그 날짜에서 1달, 6개월은 6달.

## 최고/최저

`periodProductList` 행에 최고·최저 필드가 없다. 같은 구간의 중품(05)을 다시 조회해 상품/중품으로 보여 준다. 최고/최저로 이름을 바꾸지 않는다.

휴장(주말·공휴일·`-`)은 달력 축에 남기고 직전 거래가 forward-fill. 상세 카드는 휴장과 직전 종가를 말한다. 기본 선택일은 가장 최근 실제 거래일이다.

## 빌드

`npm run build` 성공 (Next.js 16.4.3). 라우트 `/` 정적, `/api/kamis` 동적. `npx eslint .` 통과. `scripts/check-series.ts`로 쉼표/`-` 파싱, 휴장 보정, 전년 날짜 필터를 확인했다.

## 브라우저에서 확인한 것

- 키 없음: 인증키 안내만 보이고 차트·임의 가격은 없다. 품목 칩을 바꿔도 같다. 좁은 폭에서 칩이 줄바꿈된다.
- 키 있음: 상추 최근 1개월, 기본 선택 2026-10-28 상품 17,800원 / 중품 11,977원, 전일 대비 ▼ 1,700원(8.7%).
- 양파로 전환, 최근 6개월과 최근 1개월, 전년 비교 켜기(안내 문구, 점선 없음) 후 끄기.
- 차트에서 2026-10-04(일)를 눌러 카드가 휴장·직전 종가 18,980원으로 바뀜.
- 배추는 가을 품종 안내와 10월 말의 짧은 선. 좁은 폭에서 깨지지 않음.

영상: `/opt/cursor/artifacts/kamis-dashboard-item-period-compare-click.mp4`

## 한계

- 기간 API는 오늘부터 약 1년만 준다. 2026-10-29 기준 전년 같은 1개월·6개월(종료 2026-10-28)은 보관 시작(2025-10-29)보다 앞이라 비교 선이 비는다. 오류로 처리하지 않고 안내한다.
- 배추는 가을 품종만 있다. 2026-10-28에 시세가 있던 가을을 골랐고, 다른 철에는 이 코드가 비어 있을 수 있다. 무는 이후 품종 전체를 날짜별 평균으로 바꿨다. 시트에 넣은 487일과 2026-10-28 매입 보류 문장은 `internal/kamis-forecast.md`의 “무 품종 전체”에 있다.
- 추세 문장은 API에 없어 전일 대비로 한 줄을 만든다.
- 시트 연결, 웹 앱, 상추 2년 적재와 2026-10-28 매입 문장은 `internal/kamis-forecast.md`의 “구글 시트 연결”에 있다. 양배추·청오이·팽이버섯·주키니호박·애호박과 새송이버섯 2년 적재는 같은 파일의 “품목 다섯 개 추가”에 있다.
