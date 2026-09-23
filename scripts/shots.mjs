// Usage: node scripts/shots.mjs [route ...]   (dev server must be running)
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const routes = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["/", "/create", "/community", "/games/tidepool", "/play/tidepool"];
const viewports = {
  desktop: { width: 1440, height: 900, isMobile: false },
  mobile: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
};

mkdirSync("screenshots", { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
for (const [name, vp] of Object.entries(viewports)) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    isMobile: vp.isMobile,
    hasTouch: vp.hasTouch ?? false,
    deviceScaleFactor: vp.deviceScaleFactor ?? 1,
  });
  const page = await ctx.newPage();
  for (const route of routes) {
    await page.goto(BASE + route, { waitUntil: "networkidle" });
    await page.waitForTimeout(400);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    const slug = route === "/" ? "landing" : route.replace(/^\//, "").replace(/[\/\[\]]+/g, "-");
    const out = `screenshots/${slug}-${name}.png`;
    await page.screenshot({ path: out, fullPage: false });
    console.log(`${out}${overflow > 0 ? `  !! horizontal overflow ${overflow}px` : ""}`);
  }
  await ctx.close();
}
await browser.close();
