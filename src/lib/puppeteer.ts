import puppeteer, { type Browser } from "puppeteer-core";

let _browser: Browser | null = null;

export async function getBrowser(): Promise<Browser> {
  if (_browser && _browser.connected) return _browser;

  if (process.env.VERCEL) {
    const chromium = (await import("@sparticuz/chromium")).default;
    _browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1280, height: 720 },
      executablePath: await chromium.executablePath(),
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
