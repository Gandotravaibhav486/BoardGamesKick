// End-to-end: CREATE → GENERATE (real AI) → detail → PLAY → take an action.
// Usage: node scripts/e2e-create-play.mjs   (dev server must be running)
import { chromium } from "playwright-core";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const title = `Harbor Lights ${Date.now().toString(36).slice(-4)}`;
const rules = `Harbor Lights is a lantern-drafting game for 2 to 4 players. Each round, seven docks are each stocked with four lanterns drawn from a cloth sack. There are five lantern colours: crimson, amber, jade, cobalt and pearl, twenty of each. On your turn, take every lantern of one colour from a single dock; the other lanterns on that dock slide into the shared harbour. You may instead take every lantern of one colour from the harbour; the first player to do so each round also takes the harbourmaster token and will start the next round. Place the lanterns you took into one of your five pier rows, which hold 1, 2, 3, 4 and 5 lanterns and may only ever hold one colour at a time. Lanterns that do not fit fall into your bilge, which costs 1, 1, 2, 2, 2, 3 and 3 points for each lantern in it. When the docks and harbour are empty the round ends: every full pier row lights one lantern on your lighthouse mosaic, a five by five grid where each colour appears once per row and column, and scores one point plus one for each connected lantern in its row and column. The game ends after the round in which a player completes a full row of their lighthouse. Completed rows are worth 2 points, completed columns 7, and five lanterns of one colour 10. Players may also trade lanterns with each other once per round.`;

const b = await chromium.launch({ channel: "chrome", headless: true });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
p.on("pageerror", (e) => errors.push("pageerror: " + e.message));
p.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

const t0 = Date.now();
await p.goto(`${BASE}/create`, { waitUntil: "networkidle" });
await p.fill("#title", title);
await p.fill("#pitch", "Light the harbour before your rivals do.");
await p.fill("#estimatedMinutes", "35");
await p.fill("#rulesText", rules);
await p.click("button[type=submit]");
await p.screenshot({ path: "screenshots/create-compiling-desktop.png" });
await p.waitForURL(/\/games\//, { timeout: 180_000 });
const compileMs = Date.now() - t0;
console.log("redirected to", p.url(), `after ${compileMs}ms`);
await p.waitForLoadState("networkidle");
const body = await p.textContent("body");
console.log("h1:", await p.textContent("h1"));
console.log("compiled panel:", body.includes("compiled"));
console.log("mentions model:", /claude-[a-z0-9-]+/.test(body) ? body.match(/claude-[a-z0-9-]+/)[0] : "no");
console.log("unsupported rules listed:", body.includes("Unsupported rules") && !body.includes("Unsupported rules\nNone"));
await p.screenshot({ path: "screenshots/games-created-ai-desktop.png", fullPage: true });

await p.getByRole("link", { name: /play now/i }).click();
await p.waitForURL(/\/play\//, { timeout: 15_000 });
await p.waitForLoadState("networkidle");
await p.waitForTimeout(600);
const tiles = p.locator(".bg-felt button[aria-label]:visible");
console.log("visible tiles on felt:", await tiles.count());
await p.screenshot({ path: "screenshots/play-ai-game-desktop.png" });
await tiles.first().click();
const legal = p.locator("[role=button][tabindex='0']:visible");
console.log("legal destinations:", await legal.count());
await legal.first().click();
await p.locator("button:visible", { hasText: /^Confirm$/ }).first().click();
await p.waitForTimeout(3000);
const logText = await p.locator("text=/Game log/i").first().locator("..").textContent().catch(() => "");
console.log("log has content:", !(await p.textContent("body")).includes("No moves yet"));
await p.screenshot({ path: "screenshots/play-ai-game-after-move-desktop.png" });
console.log("errors:", errors);
await b.close();
