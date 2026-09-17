const { chromium } = require("playwright");

const SCREENSHOT_DIR = "/tmp/claude-1000/-mnt-linux-storage-projects-97thfloor-monday-projects-workspace-97th-frontend/bd491d94-f7e0-4097-b271-ea2c35c7ba25/scratchpad";

(async () => {
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(String(err)));

  await page.goto("http://localhost:3000/signin", { waitUntil: "domcontentloaded" });
  await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 20000 });

  const email_input = page.locator('input[type="email"], input[name="email"]').first();
  const password_input = page.locator('input[type="password"], input[name="password"]').first();
  await email_input.fill("tester@example.com");
  await password_input.fill("test12345");
  await page.screenshot({ path: `${SCREENSHOT_DIR}/01-signin-filled.png` });

  const submit_button = page.getByRole("button", { name: "Sign in", exact: true });
  await submit_button.click();

  await page.waitForURL(/workspace-home|boards|workspaces/, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/02-after-login.png` });
  console.log("URL after login:", page.url());

  await page.getByText("Podcast production", { exact: true }).click();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/03-board.png`, fullPage: false });
  console.log("URL on board:", page.url());

  const first_row = page.locator("text=Expert moments podcast brief").first();
  await first_row.hover();
  await page.locator('[title="Open item"]').first().click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/04-drawer-attempt.png`, fullPage: false });
  console.log("URL after drawer attempt:", page.url());

  const composer = page.locator(".shell-rich-text-editor").first();
  await composer.click();
  await page.keyboard.type("Hey @", { delay: 60 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/05-mention-trigger.png`, fullPage: false });

  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/06-mention-picker.png`, fullPage: false });

  await page.getByText("Amanda Carter", { exact: true }).click();
  await page.waitForTimeout(500);
  await page.keyboard.type("thanks for the update!", { delay: 30 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/07-mention-inserted.png`, fullPage: false });

  const mention_color = await composer.evaluate((el) => {
    const span = Array.from(el.querySelectorAll("span")).find((s) => s.textContent?.includes("Amanda Carter"));
    return span ? getComputedStyle(span).color : "NOT FOUND";
  });
  console.log("Mention span computed color:", mention_color);
  console.log("Composer HTML:", await composer.evaluate((el) => el.innerHTML));

  console.log("URL after drawer attempt:", page.url());
  console.log("ERRORS SO FAR:", JSON.stringify(errors));
  await browser.close();
})().catch((err) => {
  console.error("SCRIPT FAILED:", err);
  process.exit(1);
});
