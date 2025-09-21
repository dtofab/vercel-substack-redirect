// Vercel Serverless Function: logs UTM data then redirects to Substack
// Customised: default utm_medium=organic_social, expanded bot regex

export default async function handler(req, res) {
  try {
    const SUBSTACK_URL = process.env.SUBSTACK_URL; // e.g. https://yourpub.substack.com
    const DEFAULT_CAMPAIGN = process.env.DEFAULT_CAMPAIGN || "unspecified";
    const LOG_ENDPOINT = process.env.LOG_ENDPOINT; // Google Apps Script Web App URL

    if (!SUBSTACK_URL) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Missing SUBSTACK_URL env variable" }));
      return;
    }

    // Required shortlink identifier (your LinkedIn post or static placement ID)
    const id = (req.query.id || req.query.utm_content || "").toString();
    if (!id) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Missing required query param: id" }));
      return;
    }

    // UTM defaults; can be overridden via query string
    const utm_source   = (req.query.utm_source   || "linkedin").toString();
    const utm_medium   = (req.query.utm_medium   || "organic_social").toString(); // changed default
    const utm_campaign = (req.query.utm_campaign || DEFAULT_CAMPAIGN).toString();
    const utm_content  = (req.query.utm_content  || id).toString();

    // Bot detection: broader set of common preview crawlers
    const ua = req.headers["user-agent"] || "";
    const isBot = /bot|crawler|spider|crawling|preview|linkedinbot|facebookexternalhit|slackbot|discordbot|telegrambot|twitterbot/i.test(ua);

    // Best-effort IP and referrer
    const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim();
    const referrer = req.headers["referer"] || "";

    // Build target with UTMs
    const target = `${SUBSTACK_URL.replace(/\/$/, "")}/?utm_source=${encodeURIComponent(utm_source)}&utm_medium=${encodeURIComponent(utm_medium)}&utm_campaign=${encodeURIComponent(utm_campaign)}&utm_content=${encodeURIComponent(utm_content)}`;

    // Log payload
    const payload = {
      id,
      ts: new Date().toISOString(),
      ip,
      ua,
      referrer,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      isBot
    };

    // Fire-and-forget logging to Google Apps Script (if configured)
    if (LOG_ENDPOINT) {
      try {
        await fetch(LOG_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      } catch (err) {
        // Do not block redirect on logging error
        console.error("Logging failed", err?.message || err);
      }
    }

    // Redirect immediately
    res.writeHead(302, {
      Location: target,
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow"
    });
    res.end();
  } catch (err) {
    console.error(err);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Unexpected error" }));
  }
}

