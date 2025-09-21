export default async function handler(req, res) {
  const url = process.env.LOG_ENDPOINT || "";
  const sample = {
    id: "ping",
    ts: new Date().toISOString(),
    ip: "0.0.0.0",
    ua: "vercel-ping",
    referrer: "https://ping",
    utm_source: "test",
    utm_medium: "test",
    utm_campaign: "test",
    utm_content: "test",
    isBot: false
  };

  let out = { ok: true, LOG_ENDPOINT_present: !!url, status: null, text: null };
  try {
    if (!url) throw new Error("LOG_ENDPOINT missing");
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sample)
    });
    out.status = r.status;
    out.text = await r.text();
  } catch (e) {
    out.ok = false;
    out.error = String(e);
  }
  res.status(200).json(out);
}
