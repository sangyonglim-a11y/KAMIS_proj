export async function postToGas(payload: Record<string, unknown>) {
  const url = process.env.GAS_WEBAPP_URL?.trim();
  if (!url) {
    throw Object.assign(new Error("Apps Script 주소가 없습니다. GAS_WEBAPP_URL을 설정하세요."), {
      code: "MISSING_GAS",
      status: 503,
    });
  }
  const token = process.env.GAS_APP_TOKEN?.trim();
  const body = { ...payload, token: token || undefined };

  const postRes = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    redirect: "manual",
  });

  let text = await postRes.text();
  const loc = postRes.headers.get("location");
  if ((postRes.status === 302 || postRes.status === 303) && loc) {
    const follow = await fetch(loc, { method: "GET" });
    text = await follow.text();
  }

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { ok: false, raw: text.slice(0, 500) };
  }
}
