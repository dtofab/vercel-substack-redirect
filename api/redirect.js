export default async function handler(req, res) {
  try {
    const LOG_ENDPOINT     = process.env.LOG_ENDPOINT;     // existing logger
    const LOOKUP_ENDPOINT  = process.env.LOOKUP_ENDPOINT;  // Apps Script /exec
    const DEFAULT_CAMPAIGN = process.env.DEFAULT_CAMPAIGN || "unspecified";

    const id = (req.query.id || "").toString();
    if (!id) return res.status(400).json({ error: "Missing required path id. Use /r/:id" });

    // 1) Resolve destination from Links sheet (column C)
    const r = await fetch(`${LOOKUP_ENDPOINT}?id=${encodeURIComponent(id)}`);
    const data = await r.json();
    if (!data?.url) return res.status(404).json({ error: "Unknown id" });

    // 2) UTMs
    const utm_source   = (req.query.utm_source   || "linkedin").toString();
    const utm_medium   = (req.query.utm_medium   || "organic_social").toString();
    const utm_campaign = (req.query.utm_campaign || DEFAULT_CAMPAIGN).toString();
    const utm_content  = (req.query.utm_content  || id).toString();

    // 3) Target = per-post URL + UTMs
    const base = data.url.replace(/\/$/, "");
    const target = `${base}?utm_source=${encodeURIComponent(utm_source)}&utm_medium=${encodeURIComponent(utm_medium)}&utm_campaign=${encodeURIComponent(utm_campaign)}&utm_content=${encodeURIComponent(utm_content)}`;

    // 4) Log (fire-and-forget)
    if (LOG_ENDPOINT) {
      const ua = req.headers["user-agent"] || "";
      const ip = ((req.headers["x-forwarded-for"] || req.headers["x-real-ip"] || "") + ",").split(",")[0].trim();
      const referrer = req.headers["referer"] || "";
      const payload = { id, ts:new Date().toISOString(), ip, ua, referrer, utm_source, utm_medium, utm_campaign, utm_content, isBot:/bot|crawler|spider|preview|linkedinbot|facebookexternalhit|slackbot|discordbot|telegrambot|twitterbot/i.test(ua), target };
      fetch(LOG_ENDPOINT, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(payload) }).catch(()=>{});
    }

    // 5) Redirect
    res.writeHead(302, { Location: target, "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" });
    res.end();

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Unexpected error" });
  }
}
