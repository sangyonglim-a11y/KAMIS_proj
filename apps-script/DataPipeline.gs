/**
 * gogiparty DataPipeline — Google Apps Script
 *
 * 시트 탭: 야채시세 / 육류시세 / 품목(선택)
 * 스크립트 속성:
 *   APP_TOKEN, GEMINI_API_KEY, GEMINI_MODEL(선택),
 *   KAMIS_CERT_KEY, KAMIS_CERT_ID, DATA_GO_KR_SERVICE_KEY(선택)
 *
 * 배포: 웹 앱 → 실행: 나 / 액세스: 모든 사용자, 시간대 Asia/Seoul
 *
 * 주의: B2B 사이트 HTML은 수시로 바뀝니다. fetchMeatPrices 의 정규식·URL은
 * 실제 페이지에 맞게 조정하세요. 이용약관·robots 정책을 확인한 뒤 사용하세요.
 */

var SHEET_VEG = "야채시세";
var SHEET_MEAT = "육류시세";
var SHEET_ITEMS = "품목";
var FETCH_DELAY_MS = 1200;

/** 초기 육류 10종 (+ 동적 추가 가능) */
function defaultMeatCatalog_() {
  return [
    { id: "us-hwangje-galbisal", name: "황제소갈비살", group: "imported_beef", origin: "미국산", brand: "", part: "황제소갈비살", unit: "kg", keyword: "황제소갈비살" },
    { id: "us-neukgansal", name: "늑간살(수입소)", group: "imported_beef", origin: "미국산", brand: "", part: "늑간살", unit: "kg", keyword: "늑간살 소고기" },
    { id: "us-almoksim", name: "알목심", group: "imported_beef", origin: "미국산", brand: "", part: "알목심", unit: "kg", keyword: "알목심" },
    { id: "us-salchisal", name: "살치살", group: "imported_beef", origin: "미국산", brand: "", part: "살치살", unit: "kg", keyword: "살치살" },
    { id: "iberico-moksal", name: "이베리코 흑돼지 목살", group: "imported_pork", origin: "스페인", brand: "이베리코", part: "목살", unit: "kg", keyword: "이베리코 목살" },
    { id: "iberico-neukgan", name: "이베리코 흑돼지 늑간살", group: "imported_pork", origin: "스페인", brand: "이베리코", part: "늑간살", unit: "kg", keyword: "이베리코 늑간살" },
    { id: "iberico-hangjeong", name: "이베리코 흑돼지 항정살", group: "imported_pork", origin: "스페인", brand: "이베리코", part: "항정살", unit: "kg", keyword: "이베리코 항정살" },
    { id: "chile-moksal", name: "칠레산 목살", group: "imported_pork", origin: "칠레산", brand: "", part: "목살", unit: "kg", keyword: "칠레 목살" },
    { id: "chile-samgyeop", name: "칠레산 삼겹살", group: "imported_pork", origin: "칠레산", brand: "", part: "삼겹살", unit: "kg", keyword: "칠레 삼겹살" },
    { id: "hanwoo-hongdukkae", name: "한우/육우 홍두깨살", group: "domestic_beef", origin: "국산", brand: "한우/육우", part: "홍두깨살", unit: "kg", keyword: "홍두깨살" },
    { id: "kr-samgyeop", name: "국내산 삼겹살", group: "domestic_pork", origin: "국산", brand: "", part: "삼겹살", unit: "kg", keyword: "국내산 삼겹살" },
  ];
}

function doGet(e) {
  try {
    var p = (e && e.parameter) || {};
    if (p.token && !checkToken_(p.token)) {
      return json_({ ok: false, error: "UNAUTHORIZED" });
    }
    var action = p.action || "ping";
    if (action === "ping") {
      return json_({ ok: true, service: "gogiparty-datapipeline" });
    }
    if (action === "rows") {
      var category = p.category === "meat" ? "meat" : "veg";
      var itemCode = p.itemCode || "";
      var sheetName = category === "meat" ? SHEET_MEAT : SHEET_VEG;
      var rows = readPriceRows_(sheetName, itemCode);
      return json_({ ok: true, category: category, itemCode: itemCode, rows: rows });
    }
    if (action === "catalog") {
      return json_({ ok: true, meat: defaultMeatCatalog_() });
    }
    return json_({ ok: true, service: "gogiparty-datapipeline" });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  try {
    var body = {};
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }
    if (!checkToken_(body.token)) {
      return json_({ ok: false, error: "UNAUTHORIZED" });
    }
    var action = body.action || "addItem";
    if (action === "collectDaily") {
      return json_(collectDailyMeat_());
    }
    if (action === "addItem") {
      return json_(addItem_(body));
    }
    return json_({ ok: false, error: "UNKNOWN_ACTION" });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function checkToken_(token) {
  var expected = PropertiesService.getScriptProperties().getProperty("APP_TOKEN");
  if (!expected) return true;
  return String(token || "") === expected;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

function ss_() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function ensureSheets_() {
  var ss = ss_();
  [SHEET_VEG, SHEET_MEAT, SHEET_ITEMS].forEach(function (name) {
    if (!ss.getSheetByName(name)) ss.insertSheet(name);
  });
  ensureHeaders_(ss.getSheetByName(SHEET_VEG), vegHeaders_());
  ensureHeaders_(ss.getSheetByName(SHEET_MEAT), meatHeaders_());
  ensureHeaders_(ss.getSheetByName(SHEET_ITEMS), itemHeaders_());
}

function vegHeaders_() {
  return ["날짜", "품목코드", "품목명", "구분", "도매가", "단위", "거래동향", "AI_예측", "매입액션", "수집시각"];
}

function meatHeaders_() {
  return [
    "날짜",
    "품목코드",
    "품목명",
    "구분",
    "도매가",
    "최저가",
    "평균가",
    "단위",
    "분류",
    "원산지",
    "브랜드",
    "부위",
    "출처",
    "거래동향",
    "AI_예측",
    "매입액션",
    "수집시각",
  ];
}

function itemHeaders_() {
  return ["품목코드", "품목명", "카테고리", "분류", "원산지", "브랜드", "부위", "단위", "검색키워드", "상품URL", "등록일"];
}

function ensureHeaders_(sheet, headers) {
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    return;
  }
  var existing = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  if (!existing[0]) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
}

/**
 * B2B(미트박스 검색) HTML에서 가격 후보를 뽑아 최저/평균을 계산.
 * HTML 구조 변경 시 정규식을 업데이트하세요.
 */
function fetchMeatPrices(item) {
  var keyword = encodeURIComponent(item.keyword || item.name || item.part || "");
  // 공개 검색 URL — 실제 사이트 경로에 맞게 수정
  var url =
    item.productUrl ||
    "https://www.meatbox.co.kr/goods/goods_search.php?keyword=" + keyword;

  Utilities.sleep(FETCH_DELAY_MS);

  var res = UrlFetchApp.fetch(url, {
    muteHttpExceptions: true,
    followRedirects: true,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; GogipartyBot/1.0; +https://gogiparty.local)",
      Accept: "text/html,application/xhtml+xml",
    },
  });

  var code = res.getResponseCode();
  var html = res.getContentText("UTF-8");
  if (code >= 400) {
    return {
      ok: false,
      error: "HTTP_" + code,
      min: null,
      avg: null,
      samples: [],
      source: url,
    };
  }

  var prices = extractWonPrices_(html);
  // 비정상 고가/저가 필터 (원/kg 가정 1,000 ~ 200,000)
  prices = prices.filter(function (p) {
    return p >= 1000 && p <= 200000;
  });
  // 상위 노출 위주 샘플
  prices = prices.slice(0, 24);

  if (!prices.length) {
    return {
      ok: false,
      error: "NO_PRICE_MATCH",
      min: null,
      avg: null,
      samples: [],
      source: url,
      hint: "검색 HTML에서 가격 패턴을 찾지 못했습니다. productUrl 또는 정규식을 확인하세요.",
    };
  }

  var min = Math.min.apply(null, prices);
  var sum = prices.reduce(function (a, b) {
    return a + b;
  }, 0);
  var avg = Math.round(sum / prices.length);

  return {
    ok: true,
    min: min,
    avg: avg,
    samples: prices,
    source: url,
  };
}

function extractWonPrices_(html) {
  var text = String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/&nbsp;/g, " ");

  var found = [];
  var patterns = [
    /₩\s*([0-9]{1,3}(?:,[0-9]{3})+)/g,
    /([0-9]{1,3}(?:,[0-9]{3})+)\s*원/g,
    /"price"\s*:\s*"?([0-9]{3,7})"?/gi,
    /data-price=["']([0-9]{3,7})["']/gi,
  ];

  patterns.forEach(function (re) {
    var m;
    while ((m = re.exec(text))) {
      var n = Number(String(m[1]).replace(/,/g, ""));
      if (Number.isFinite(n)) found.push(n);
    }
  });
  return found;
}

function todayYmd_() {
  return Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy-MM-dd");
}

function nowStamp_() {
  return Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy-MM-dd HH:mm:ss");
}

function appendMeatRow_(item, priceInfo, ai) {
  ensureSheets_();
  var sheet = ss_().getSheetByName(SHEET_MEAT);
  var date = todayYmd_();
  var price = priceInfo.avg != null ? priceInfo.avg : priceInfo.min;
  // 같은 날짜·품목·일별 중복 방지
  if (hasRow_(sheet, date, item.id, "일별")) return { skipped: true };

  sheet.appendRow([
    date,
    item.id,
    item.name,
    "일별",
    price,
    priceInfo.min,
    priceInfo.avg,
    item.unit || "kg",
    item.group || "",
    item.origin || "",
    item.brand || "",
    item.part || "",
    priceInfo.source || "meatbox",
    priceInfo.ok ? "검색가 샘플 " + (priceInfo.samples || []).length + "건" : String(priceInfo.error || ""),
    (ai && ai.summary) || "",
    (ai && ai.action) || "",
    nowStamp_(),
  ]);
  return { skipped: false, price: price };
}

function hasRow_(sheet, date, itemCode, kind) {
  var values = sheet.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    var d = values[i][0];
    var ds =
      d instanceof Date
        ? Utilities.formatDate(d, "Asia/Seoul", "yyyy-MM-dd")
        : String(d).slice(0, 10);
    if (ds === date && String(values[i][1]) === itemCode && String(values[i][3]) === kind) {
      return true;
    }
  }
  return false;
}

function recentPricesForItem_(sheetName, itemCode, limit) {
  var sheet = ss_().getSheetByName(sheetName);
  var values = sheet.getDataRange().getValues();
  var rows = [];
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][1]) !== itemCode) continue;
    if (String(values[i][3]) && String(values[i][3]) !== "일별") continue;
    var d = values[i][0];
    var ds =
      d instanceof Date
        ? Utilities.formatDate(d, "Asia/Seoul", "yyyy-MM-dd")
        : String(d).slice(0, 10);
    var price = Number(String(values[i][4]).replace(/,/g, ""));
    if (!Number.isFinite(price)) continue;
    rows.push({ date: ds, price: price });
  }
  rows.sort(function (a, b) {
    return a.date < b.date ? -1 : 1;
  });
  return rows.slice(-1 * (limit || 30));
}

function forecastBuyTiming_(itemName, unit, recent) {
  var key = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
  if (!key) return { summary: "", action: "", warn: "NO_GEMINI_KEY" };
  var model =
    PropertiesService.getScriptProperties().getProperty("GEMINI_MODEL") ||
    "gemini-2.5-flash";

  var lines = recent
    .map(function (r) {
      return r.date + ": " + r.price;
    })
    .join("\n");
  var changePct = "";
  if (recent.length >= 2) {
    var a = recent[0].price;
    var b = recent[recent.length - 1].price;
    changePct = a ? (((b - a) / a) * 100).toFixed(1) : "";
  }

  var prompt =
    "당신은 한국 식자재(육류/농산물) 도매 매입 조언을 합니다.\n" +
    "품목: " +
    itemName +
    " (" +
    unit +
    ")\n최근 거래가:\n" +
    lines +
    "\n기간 변동률(%): " +
    changePct +
    "\n향후 10~20일 관점에서 지금 대량 매입할지, 분할 매입할지, 관망/보류할지를 3문장 이내로 요약하세요.\n" +
    '반드시 JSON만 출력: {"summary":"...","action":"적극 매입|관망|소량 분할 매입|매입 보류"}';

  var endpoint =
    "https://generativelanguage.googleapis.com/v1beta/models/" +
    encodeURIComponent(model) +
    ":generateContent?key=" +
    encodeURIComponent(key);

  var res = UrlFetchApp.fetch(endpoint, {
    method: "post",
    contentType: "application/json",
    muteHttpExceptions: true,
    payload: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4 },
    }),
  });

  if (res.getResponseCode() >= 400) {
    return { summary: "", action: "", warn: "GEMINI_HTTP_" + res.getResponseCode() };
  }
  var json = JSON.parse(res.getContentText());
  var text = "";
  try {
    text = json.candidates[0].content.parts
      .map(function (p) {
        return p.text || "";
      })
      .join("");
  } catch (e) {
    return { summary: "", action: "", warn: "GEMINI_PARSE" };
  }
  var m = text.match(/\{[\s\S]*\}/);
  if (!m) return { summary: "", action: "관망", warn: "GEMINI_NO_JSON" };
  try {
    var parsed = JSON.parse(m[0]);
    var actions = ["적극 매입", "관망", "소량 분할 매입", "매입 보류"];
    var action = actions.indexOf(parsed.action) >= 0 ? parsed.action : "관망";
    return {
      summary: String(parsed.summary || "").slice(0, 600),
      action: action,
      warn: "",
    };
  } catch (e2) {
    return { summary: "", action: "관망", warn: "GEMINI_JSON" };
  }
}

function collectDailyMeat_() {
  ensureSheets_();
  var catalog = loadMeatCatalog_();
  var results = [];
  for (var i = 0; i < catalog.length; i++) {
    var item = catalog[i];
    var priceInfo = fetchMeatPrices(item);
    var recent = recentPricesForItem_(SHEET_MEAT, item.id, 30);
    if (priceInfo.ok && priceInfo.avg != null) {
      recent.push({ date: todayYmd_(), price: priceInfo.avg });
    }
    var ai = forecastBuyTiming_(item.name, item.unit || "kg", recent);
    var written = null;
    if (priceInfo.ok) {
      written = appendMeatRow_(item, priceInfo, ai);
    }
    results.push({
      id: item.id,
      name: item.name,
      price: priceInfo,
      ai: ai,
      written: written,
    });
  }
  return { ok: true, date: todayYmd_(), results: results };
}

function loadMeatCatalog_() {
  ensureSheets_();
  var sheet = ss_().getSheetByName(SHEET_ITEMS);
  var values = sheet.getDataRange().getValues();
  var fromSheet = [];
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][2]) !== "meat") continue;
    fromSheet.push({
      id: String(values[i][0]),
      name: String(values[i][1]),
      group: String(values[i][3] || ""),
      origin: String(values[i][4] || ""),
      brand: String(values[i][5] || ""),
      part: String(values[i][6] || ""),
      unit: String(values[i][7] || "kg"),
      keyword: String(values[i][8] || values[i][1]),
      productUrl: String(values[i][9] || ""),
    });
  }
  if (fromSheet.length) return fromSheet;
  return defaultMeatCatalog_();
}

function addItem_(body) {
  ensureSheets_();
  var category = body.category === "meat" ? "meat" : "veg";
  if (category === "meat") {
    var id = body.itemCode || slug_(body.itemName || body.part || "meat");
    var item = {
      id: id,
      name: body.itemName || body.part || id,
      group: body.meatGroup || body.group || "",
      origin: body.origin || "",
      brand: body.brand || "",
      part: body.part || body.itemName || "",
      unit: body.unit || "kg",
      keyword: body.searchKeyword || body.itemName || body.part || "",
      productUrl: body.productUrl || "",
    };
    upsertItemMeta_(item, "meat");
    var priceInfo = fetchMeatPrices(item);
    var recent = recentPricesForItem_(SHEET_MEAT, item.id, 30);
    if (priceInfo.ok && priceInfo.avg != null) {
      recent.push({ date: todayYmd_(), price: priceInfo.avg });
    }
    var ai = forecastBuyTiming_(item.name, item.unit, recent);
    var written = priceInfo.ok ? appendMeatRow_(item, priceInfo, ai) : null;
    // 과거가 없으면 당일 1점만 — 추가 수집은 collectDaily / 수동 URL
    return {
      ok: true,
      category: "meat",
      item: item,
      price: priceInfo,
      ai: ai,
      written: written,
    };
  }

  // 야채: 메타만 등록하고, 실제 이력은 기존 공공데이터/시트 수집 흐름 유지
  var veg = {
    id: body.itemCode || slug_(body.itemName || "veg"),
    name: body.itemName || body.itemCode,
    group: "",
    origin: "",
    brand: "",
    part: body.kindName || "",
    unit: body.unit || "",
    keyword: body.itemName || "",
    productUrl: "",
  };
  upsertItemMeta_(veg, "veg");
  return { ok: true, category: "veg", item: veg, note: "야채 이력은 야채시세 탭/공공 API 수집을 사용하세요." };
}

function upsertItemMeta_(item, category) {
  var sheet = ss_().getSheetByName(SHEET_ITEMS);
  var values = sheet.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]) === item.id) {
      sheet.getRange(i + 1, 1, 1, 11).setValues([
        [
          item.id,
          item.name,
          category,
          item.group || "",
          item.origin || "",
          item.brand || "",
          item.part || "",
          item.unit || "kg",
          item.keyword || "",
          item.productUrl || "",
          nowStamp_(),
        ],
      ]);
      return;
    }
  }
  sheet.appendRow([
    item.id,
    item.name,
    category,
    item.group || "",
    item.origin || "",
    item.brand || "",
    item.part || "",
    item.unit || "kg",
    item.keyword || "",
    item.productUrl || "",
    nowStamp_(),
  ]);
}

function slug_(s) {
  return String(s)
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9가-힣\-_]/g, "")
    .slice(0, 48);
}

function readPriceRows_(sheetName, itemCode) {
  ensureSheets_();
  var sheet = ss_().getSheetByName(sheetName);
  var values = sheet.getDataRange().getValues();
  var headers = values[0];
  var out = [];
  for (var i = 1; i < values.length; i++) {
    if (itemCode && String(values[i][1]) !== itemCode) continue;
    var obj = {};
    for (var c = 0; c < headers.length; c++) {
      var v = values[i][c];
      if (v instanceof Date) {
        v = Utilities.formatDate(v, "Asia/Seoul", "yyyy-MM-dd HH:mm:ss");
      }
      obj[headers[c]] = v;
    }
    out.push(obj);
  }
  return out;
}

/** 매일 7시 트리거 */
function installDailyTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === "collectDaily") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("collectDaily").timeBased().atHour(7).everyDays(1).create();
}

function collectDaily() {
  collectDailyMeat_();
  // 야채 일별은 기존 KAMIS/공공데이터 수집 스크립트와 병행 가능
}

/** 시트 초기 헤더 + 기본 육류 품목 시드 */
function setup() {
  ensureSheets_();
  var catalog = defaultMeatCatalog_();
  catalog.forEach(function (item) {
    upsertItemMeta_(item, "meat");
  });
  return "ok";
}
