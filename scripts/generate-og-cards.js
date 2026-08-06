// Renders the social sharing cards (og:image, 1200x630 @2x) into public/og/
// from an HTML template in the site's design system. Run from the repo root
// with the dev server up on localhost:3000 (it serves the logo):
//
//   npm i -D playwright-core   (once)
//   node scripts/generate-og-cards.js
//
// Re-run whenever the comp-set figures change — every number in VARIANTS below
// is baked into the PNGs and must mirror what the live pages display (scrape
// them from the rendered pages, do not invent them). Wired to pages via
// src/lib/og.ts.
const { chromium } = require("playwright-core");
const fs = require("fs");

// A Playwright-managed Chromium. Override with OG_CHROMIUM=/path/to/chromium
// if your cached browser revision differs.
const SHELL =
  process.env.OG_CHROMIUM ??
  process.env.HOME +
    "/Library/Caches/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-mac-arm64/chrome-headless-shell";

const C = {
  ink: "#0a0a0a", charcoal: "#151515", steel: "#545454", fog: "#858585",
  pewter: "#9d9d9d", dove: "#d5d9e2", cream: "#f9f8f6", paper: "#ffffff",
  sand: "#f2ede5", ember: "#ff5f57",
};

const marketCard = (name, line) => `
  <div style="display:flex;align-items:center;gap:18px;background:${C.cream};border-radius:16px;padding:20px 24px;">
    <span style="font-family:'Geist Mono';font-size:11px;letter-spacing:.08em;color:${C.steel};background:${C.sand};border-radius:999px;padding:5px 12px;">market</span>
    <div style="flex:1;">
      <div style="font-size:21px;font-weight:500;letter-spacing:-0.02em;color:${C.ink};">${name}</div>
      <div style="font-family:'Geist Mono';font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;color:${C.pewter};margin-top:4px;">${line}</div>
    </div>
    <span style="font-size:20px;color:${C.fog};">&rarr;</span>
  </div>`;

const ctaCard = () => `
  <div style="display:flex;align-items:center;gap:18px;background:${C.ink};border-radius:16px;padding:20px 24px;">
    <span style="font-family:'Geist Mono';font-size:11px;letter-spacing:.08em;color:${C.dove};background:${C.charcoal};border:1px solid #333;border-radius:999px;padding:5px 12px;">free</span>
    <div style="flex:1;">
      <div style="font-size:21px;font-weight:500;letter-spacing:-0.02em;color:${C.paper};">Score my listing</div>
      <div style="font-family:'Geist Mono';font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;color:${C.pewter};margin-top:4px;">0&ndash;100 score &middot; about a minute</div>
    </div>
    <span style="font-size:20px;color:${C.paper};">&rarr;</span>
  </div>`;

const statTile = (label, value) => `
  <div style="background:${C.cream};border-radius:14px;padding:22px 24px;">
    <div style="font-family:'Geist Mono';font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:${C.pewter};">${label}</div>
    <div style="font-size:27px;letter-spacing:-0.02em;color:${C.ink};margin-top:8px;">${value}</div>
  </div>`;

const statCaption = (text) => `
  <div style="font-family:'Geist Mono';font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:${C.pewter};text-align:center;margin-top:6px;">${text}</div>`;

const VARIANTS = {
  home: {
    kicker: "Airbnb listing intelligence",
    h1: "Your Airbnb is leaving money on the table.",
    h2: "We help you take it back.",
    sub: "Paste your link. Free 0–100 score, an underpricing estimate, and a fix list — every item citing measured market numbers.",
    right:
      marketCard("Bali", "26,520 villas in the comp set") +
      marketCard("Dubai", "19,100+ listings in the comp set") +
      marketCard("London", "26,800+ listings in the comp set") +
      ctaCard(),
  },
  bali: {
    kicker: "Bali listing intelligence",
    h1: "Your Airbnb is leaving money on the table.",
    h2: "We help you take it back.",
    sub: "Free 0–100 score against 26,520 villas in the Bali comp set, with an underpricing estimate and a measured fix list.",
    right:
      `<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">` +
      statTile("Listing score", "68/100") +
      statTile("Left on table", "Rp 16.3M/mo") +
      statTile("Critical fixes", "3") +
      statTile("Comp set", "2,994 villas") +
      `</div>` + statCaption("A real winner from our Canggu scan"),
  },
  dubai: { h1Size: 41,
    kicker: "Dubai listing intelligence",
    h1: "Your Dubai rental is leaving money on the table.",
    h2: "We help you take it back.",
    sub: "Free 0–100 score against 19,100+ listings in the Dubai comp set, with an underpricing estimate and a measured fix list.",
    right:
      `<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">` +
      statTile("Listing score", "74/100") +
      statTile("Left on table", "AED 13,830/mo") +
      statTile("Critical fixes", "2") +
      statTile("Comp set", "6,450 apartments") +
      `</div>` + statCaption("A real winner from our Dubai scan"),
  },
  london: { h1Size: 41,
    kicker: "London listing intelligence",
    h1: "Your London flat is leaving money on the table.",
    h2: "We help you take it back.",
    sub: "Free 0–100 score against 26,800+ listings in the London comp set, with an underpricing estimate and a measured fix list.",
    right:
      `<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">` +
      statTile("Listing score", "61/100") +
      statTile("Left on table", "£4,380/mo") +
      statTile("Critical fixes", "4") +
      statTile("Comp set", "10,000+ flats") +
      `</div>` + statCaption("A real winner from our London scan"),
  },
};

const html = (v) => `<!doctype html><html><head>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Inter',sans-serif; -webkit-font-smoothing:antialiased; }
</style></head>
<body>
<div style="width:1200px;height:630px;background:${C.paper};display:flex;gap:56px;padding:64px 68px;position:relative;overflow:hidden;">
  <div aria-hidden style="position:absolute;right:-140px;top:-180px;width:520px;height:520px;border-radius:999px;background:radial-gradient(closest-side,rgba(255,168,136,0.32),transparent);filter:blur(48px);"></div>
  <div style="flex:1.15;display:flex;flex-direction:column;position:relative;">
    <div style="display:flex;align-items:center;gap:11px;">
      <img src="http://localhost:3000/logo/optimorent-mark-ink.png" style="width:44px;height:28px;object-fit:contain;">
      <span style="font-size:23px;font-weight:500;letter-spacing:-0.02em;color:${C.ink};">OptimoRent</span>
    </div>
    <div style="margin-top:52px;font-family:'Geist Mono';font-size:13px;letter-spacing:.2em;text-transform:uppercase;color:${C.fog};">${v.kicker}</div>
    <h1 style="margin-top:18px;font-size:${v.h1Size||46}px;line-height:1.08;font-weight:400;letter-spacing:-0.025em;color:${C.ink};max-width:560px;">${v.h1}<br><span style="color:${C.fog};">${v.h2}</span></h1>
    <p style="margin-top:24px;font-size:19px;line-height:1.5;color:${C.steel};max-width:520px;">${v.sub}</p>
    <div style="margin-top:auto;display:flex;align-items:center;gap:10px;">
      <span style="width:9px;height:9px;border-radius:999px;background:${C.ember};"></span>
      <span style="font-family:'Geist Mono';font-size:15px;color:${C.ink};">optimo.rent</span>
    </div>
  </div>
  <div style="flex:1;display:flex;flex-direction:column;gap:14px;justify-content:center;position:relative;">${v.right}</div>
</div>
</body></html>`;

(async () => {
  const browser = await chromium.launch({ executablePath: SHELL });
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 2,
  });
  fs.mkdirSync("public/og", { recursive: true });
  for (const [key, v] of Object.entries(VARIANTS)) {
    await page.setContent(html(v), { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: `public/og/${key}.png` });
    console.log("rendered og/" + key + ".png");
  }
  await browser.close();
})();
