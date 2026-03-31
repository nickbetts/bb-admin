import puppeteer, { type Browser } from "puppeteer-core";

let _browser: Browser | null = null;

// chromium-min downloads the browser binary at runtime from this URL
// instead of bundling it (which fails with Turbopack on Vercel).
const CHROMIUM_PACK_URL =
  "https://github.com/nicholasgasior/chromium-brotli-binaries/releases/download/v131.0.0/chromium-v131.0.0-pack.tar";

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
