/**
 * KAMIS 도매 시세 Apps Script (참고용 스켈레톤)
 * 배포: 실행 계정 본인, 액세스 모든 사용자, 시간대 Asia/Seoul
 * 스크립트 속성: KAMIS_CERT_KEY, KAMIS_CERT_ID, GEMINI_API_KEY, APP_TOKEN(선택), DATA_GO_KR_SERVICE_KEY
 */

function doGet() {
  return ContentService.createTextOutput(
    JSON.stringify({ ok: true, service: "kamis-forecast" }),
  ).setMimeType(ContentService.MimeType.JSON);
}

/**
 * POST JSON: itemCode, itemName, categoryCode, kamisItemCode, kindCode, unit, gradeCode, token?
 * 실제 수집·시트 append·Gemini 예측은 기존 배포본 로직을 유지하세요.
 */
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || "{}");
    const props = PropertiesService.getScriptProperties();
    const token = props.getProperty("APP_TOKEN");
    if (token && body.token !== token) {
      return json_({ ok: false, error: "UNAUTHORIZED" });
    }
    // echo redirect pattern: return a short-lived result URL or inline JSON
    return json_({
      ok: true,
      received: {
        itemCode: body.itemCode,
        itemName: body.itemName,
      },
      note: "Deploy full collect logic from project notes (periodProductList / public API / Gemini).",
    });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

function installDailyTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === "collectDaily") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("collectDaily").timeBased().atHour(7).everyDays(1).create();
}

function collectDaily() {
  // Head 배포에서 등록 품목 최근 7일·동향·예측 갱신
}
