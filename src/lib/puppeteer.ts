import puppeteer, { type Browser } from "puppeteer-core";

let _browser: Browser | null = null;

/**
 * Render an HTML string in a headless browser and return a JPEG screenshot
 * Buffer (first 5 000px of page height, 1 440px wide, JPEG 55).
 *
 * Used by the LP design-audit pass so Claude can see the rendered page and
 * verify that images are displayed rather than just referenced in the HTML.
 *
 * Returns null on any failure — callers should degrade gracefully.
 */
export async function screenshotHtml(html: string): Promise<Buffer | null> {
  try {
    const browser = await getBrowser();
    const page = await browser.newPage();
    try {
      await page.setViewport({ width: 1440, height: 900 });
      await page.setContent(html, { waitUntil: "networkidle2", timeout: 15_000 });

      const pageHeight = await page.evaluate(() => document.body.scrollHeight);
      const captureHeight = Math.min(pageHeight, 5_000);

      const raw = await page.screenshot({
        type: "jpeg",
        quality: 55,
        clip: { x: 0, y: 0, width: 1440, height: captureHeight },
      });

      return Buffer.from(raw);
    } finally {
      await page.close();
    }
  } catch (err) {
    console.warn("[puppeteer] screenshotHtml failed:", err);
    return null;
  }
}

// chromium-min downloads the browser binary at runtime from this URL
// instead of bundling it (which fails with Turbopack on Vercel).
// Must match the installed @sparticuz/chromium-min version (143.0.4).
// Vercel serverless runs on x64 Linux.
const CHROMIUM_PACK_URL =
  "https://github.com/Sparticuz/chromium/releases/download/v143.0.4/chromium-v143.0.4-pack.x64.tar";

export async function getBrowser(): Promise<Browser> {
  if (_browser && _browser.connected) return _browser;

  if (process.env.VERCEL) {
    const chromium = (await import("@sparticuz/chromium-min")).default;
    _browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1280, height: 720 },
      executablePath: await chromium.executablePath(CHROMIUM_PACK_URL),
      headless: true,
    });
  } else {
    _browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      executablePath:
        process.platform === "darwin"
          ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
          : process.platform === "win32"
            ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
            : "/usr/bin/google-chrome-stable",
    });
  }

  return _browser;
}
