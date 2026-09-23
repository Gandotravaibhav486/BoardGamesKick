// Full demo: CREATE → GENERATE (real AI) → PLAY → PUBLISH → COMMUNITY → GAME PAGE → PLAY → BACK
// Usage: node scripts/e2e-full-demo.mjs   (dev server must be running)
import { chromium } from "playwright-core";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const title = `Harbor Lights ${Date.now().toString(36).slice(-4)}`;
const rules = `Harbor Lights is a lantern-drafting game for 2 to 4 players. Each round, seven docks are each stocked with four lanterns drawn from a cloth sack. There are five lantern colours: crimson, amber, jade, cobalt and pearl, twenty of each. On your turn, take every lantern of one colour from a single dock; the other lanterns on that dock slide into the shared harbour. You may instead take every lantern of one colour from the harbour; the first player to do so each round also takes the harbourmaster token and will start the next round. Place the lanterns you took into one of your five pier rows, which hold 1, 2, 3, 4 and 5 lanterns and may only ever hold one colour at a time. Lanterns that do not fit fall into your bilge, which costs 1, 1, 2, 2, 2, 3 and 3 points for each lantern in it. When the docks and harbour are empty the round ends: every full pier row lights one lantern on your lighthouse mosaic, a five by five grid where each colour appears once per row and column, and scores one point plus one for each connected lantern in its row and column. The game ends after the round in which a player completes a full row of their lighthouse. Completed rows are worth 2 points, completed columns 7, and five lanterns of one colour 10.`;

const b = await chromium.launch({ channel: "chrome", headless: true });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
p.on("pageerror", (e) => errors.push("pageerror: " + e.message));
p.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
const step = (n, ok, extra = "") => console.log(`${ok ? "PASS" : "FAIL"}  ${n}${extra ? "  — " + extra : ""}`);

// 1. CREATE → GENERATE
await p.goto(`${BASE}/`, { waitUntil: "networkidle" });
await p.getByRole("link", { name: /create a game/i }).first().click();
await p.waitForURL(/\/create/);
await p.fill("#title", title);
await p.fill("#pitch", "Light the harbour before your rivals do.");
await p.fill("#estimatedMinutes", "35");
await p.fill("#rulesText", rules);
const t0 = Date.now();
await p.click("button[type=submit]");
await p.waitForURL(/\/games\//, { timeout: 180_000 });
const gameUrl = p.url().split("?")[0];
const gameId = gameUrl.split("/games/")[1];
await p.waitForLoadState("networkidle");
step("CREATE → GENERATE", (await p.textContent("body")).includes("Your game compiled"), `${Math.round((Date.now() - t0) / 1000)}s, id=${gameId}`);

// 2. PLAY the generated game, take one action
await p.getByRole("link", { name: /^play now$/i }).first().click();
await p.waitForURL(/\/play\//);
await p.waitForLoadState("networkidle");
await p.waitForTimeout(500);
const tiles = p.locator(".bg-felt button[aria-label]:visible");
await tiles.first().click();
await p.locator("[role=button][tabindex='0']:visible").first().click();
await p.locator("button:visible", { hasText: /^Confirm$/ }).first().click();
await p.waitForTimeout(2500);
step("PLAY generated game (select → confirm)", !(await p.textContent("body")).includes("No moves yet"), `${await tiles.count()} tiles`);

// 3. Back to game page via tabletop link → lands on #campaign, then PUBLISH
await p.getByRole("link", { name: /back to game page/i }).first().click();
await p.waitForURL(/\/games\//);
step("Tabletop → game page #campaign", p.url().endsWith("#campaign"), p.url());
await p.getByRole("button", { name: /publish/i }).first().click();
await p.waitForTimeout(1500);
step("PUBLISH", (await p.textContent("body")).includes("Published"));

// 4. COMMUNITY shows the new game + Tidepool featured
await p.goto(`${BASE}/community`, { waitUntil: "networkidle" });
const communityBody = await p.textContent("body");
step("COMMUNITY lists published game", communityBody.includes(title));
step("COMMUNITY features Tidepool", communityBody.includes("Tidepool") && communityBody.includes("Curated pick"));
await p.screenshot({ path: "screenshots/demo-community-desktop.png" });

// 5. GAME PAGE for Tidepool → PLAY → return → BACK (simulated)
await p.goto(`${BASE}/games/tidepool`, { waitUntil: "networkidle" });
const before = await p.locator("#campaign").textContent();
const raisedBefore = before.match(/\$[\d,]+ of \$[\d,]+/)?.[0];
const backersBefore = Number(before.match(/(\d[\d,]*) backers/)?.[1].replace(/,/g, ""));
step("TIDEPOOL game page has campaign", Boolean(raisedBefore), `${raisedBefore}, ${backersBefore} backers`);
await p.screenshot({ path: "screenshots/demo-tidepool-page-desktop.png", fullPage: true });

await p.getByRole("link", { name: /play the game/i }).first().click();
await p.waitForURL(/\/play\/tidepool/);
step("Play before you back → /play/tidepool", p.url().includes("from=campaign"));
await p.waitForLoadState("networkidle");
await p.waitForTimeout(500);
await p.getByRole("link", { name: /back to game page/i }).first().click();
await p.waitForURL(/\/games\/tidepool/);
step("Return to campaign", p.url().endsWith("#campaign"));

await p.getByRole("button", { name: /back this game/i }).first().click();
await p.waitForTimeout(300);
const tierRadio = p.locator("#campaign input[type=radio]:not([disabled])").first();
await tierRadio.check();
await p.getByRole("button", { name: /confirm backing/i }).first().click();
await p.waitForTimeout(1500);
const after = await p.locator("#campaign").textContent();
const backersAfter = Number(after.match(/(\d[\d,]*) backers/)?.[1].replace(/,/g, ""));
step("MOCK BACK increments backers", backersAfter === backersBefore + 1, `${backersBefore} → ${backersAfter}`);
step("Simulated label present", after.includes("Simulated crowdfunding demo"));
await p.screenshot({ path: "screenshots/demo-backed-desktop.png" });

console.log("errors:", errors);
await b.close();
