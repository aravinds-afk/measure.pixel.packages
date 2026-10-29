/**
 * End-to-end check of the audit → quotation workflow on a phone viewport, then desktop.
 * Runs against a running server: npm run build && npm start, then npm run test:e2e.
 * Uses the pre-installed Playwright (require("playwright")). Screenshots and the PDF go to test-results/.
 * The website step uses an unresolvable .invalid domain on purpose: it verifies that an unreachable site
 * produces an honest "could not be reached" result instead of invented findings.
 */
const { chromium, devices } = require("playwright");
const OUT = require("path").join(__dirname, "..", "test-results");
require("fs").mkdirSync(OUT, { recursive: true });
const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const C_EMAIL = process.env.E2E_CONSULTANT_EMAIL, C_PASS = process.env.E2E_CONSULTANT_PASSWORD;
const A_EMAIL = process.env.E2E_ADMIN_EMAIL, A_PASS = process.env.E2E_ADMIN_PASSWORD;
if (!C_EMAIL || !C_PASS || !A_EMAIL || !A_PASS) { console.error("Set E2E_CONSULTANT_EMAIL/PASSWORD and E2E_ADMIN_EMAIL/PASSWORD"); process.exit(1); }
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices["iPhone 13"] });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png`, fullPage: false });
  const step = (s) => console.log("▶", s);

  step("login");
  await page.goto(`${BASE}/login`);
  await page.fill("#email", C_EMAIL);
  await page.fill("#password", C_PASS);
  await page.click("button[type=submit]");
  await page.waitForURL("**/today");
  await page.waitForSelector("text=Today's three");
  await shot("00-today");
  await page.goto(`${BASE}/audits/new?manual=1`);
  await shot("01-discovery");

  step("start audit");
  await page.fill("#website", "smile-dental.invalid");
  await page.fill("#businessName", "Smile Dental Pune");
  await page.click("text=Start Brand Audit");
  await page.waitForURL(/\/audits\/AU-/);
  await page.waitForSelector("text=Limited inspection", { timeout: 40000 });
  await shot("02-business");

  step("profile");
  await page.selectOption("#ind", "dental-clinics");
  await page.click("button:has-text('More enquiries')");
  await page.click("button:has-text('We get patients only by reference')");
  await page.fill("#cp", "Dr. Rao");
  await page.click("text=Continue to audit →");

  step("checklist");
  const setStatus = async (category, label, status) => {
    const det = page.locator("details", { has: page.locator("summary", { hasText: category }) }).first();
    if (!(await det.getAttribute("open"))) await det.locator("summary").click();
    await page.getByRole("radiogroup", { name: `Status for ${label}` }).getByRole("radio", { name: status, exact: true }).click();
  };
  await setStatus("Paid Advertising", "Google Ads running for high-intent searches", "Missing");
  await setStatus("Website & Conversion", "Dedicated landing pages for campaigns or key services", "Missing");
  await setStatus("Analytics & Measurement", "Conversions (forms, calls, WhatsApp) tracked as events", "Missing");
  await setStatus("Lead Capture", "WhatsApp click-to-chat available", "Working");
  await shot("03-checklist");
  await page.click("text=Complete audit");
  await page.waitForSelector("text=Recommended offers", { timeout: 20000 });
  await page.waitForSelector("h3:has-text('Clinic Patient Engine')");
  await shot("04-recommend");

  step("build quote");
  await page.click("text=Build quotation →");
  await page.waitForURL(/\/quotes\/QT-/, { timeout: 20000 });
  await page.waitForSelector("text=Investment", { state: "attached" });
  await shot("05-quote");

  step("add 5 social videos");
  await page.click("text=+ Add services");
  await page.click("button:has-text('All')");
  await page.fill("input[aria-label=Search]", "video");
  await page.click("button:has-text('Social media video')");
  await page.click("text=Done");
  const videoCard = page.locator(".card", { has: page.locator("text=Example price") }).first();
  await videoCard.getByLabel("Increase quantity").click();
  await videoCard.getByLabel("Increase quantity").click();
  await videoCard.getByLabel("Increase quantity").click();
  await videoCard.getByLabel("Increase quantity").click();
  const lineText = await videoCard.locator("p.num").last().innerText();
  console.log("   video line total:", lineText);
  if (!lineText.includes("17,500")) throw new Error("Video line total wrong: " + lineText);

  step("remove unpriced supporting lines if any");
  for (let i = 0; i < 6; i++) {
    const bad = page.locator(".card", { has: page.locator("text=price not set") }).first();
    if (!(await bad.count())) break;
    await bad.getByRole("button", { name: /^Remove / }).click();
  }
  await page.waitForTimeout(1500);
  await page.waitForSelector("text=All changes saved", { timeout: 10000 });
  await shot("06-configured");
  const bar = await page.locator("button[aria-expanded]").last().innerText();
  console.log("   mobile totals bar:", bar.replace(/\n/g, " | "));

  step("client view");
  await page.getByRole("radio", { name: "Client view" }).click();
  const html = await page.content();
  for (const banned of ["Delivery cost", "Internal note", "Gross profit", "score "]) if (html.includes(banned)) throw new Error("Client view leaks: " + banned);
  await shot("07-client-view");
  await page.getByRole("radio", { name: "Internal" }).click();

  step("issue & present");
  await page.click("text=Issue & present");
  await page.waitForURL(/\/present$/, { timeout: 20000 });
  const presentHtml = await page.content();
  if (presentHtml.includes("internalNote") || presentHtml.includes("deliveryCost")) throw new Error("Present page leaks internal fields");
  await shot("08-present");
  const quoteUrl = page.url().replace(/\/present$/, "");

  step("pdf");
  const pdf = await page.request.get(`${quoteUrl.replace(BASE, BASE + "/api")}/pdf`);
  const buf = await pdf.body();
  console.log("   pdf:", pdf.status(), pdf.headers()["content-type"], buf.length, "bytes");
  require("fs").writeFileSync(`${OUT}/quote.pdf`, buf);

  step("share link");
  await page.goto(quoteUrl);
  await page.click("text=Create secure link");
  await page.waitForSelector("text=Copy link");
  const qid = quoteUrl.split("/").pop();
  const shareRes = await page.request.post(`${BASE}/api/quotes/${qid}/share`, { data: { enabled: true }, headers: { origin: BASE } });
  const token = (await shareRes.json()).token;
  const anon = await browser.newContext();
  const ap = await anon.newPage();
  const r = await ap.goto(`${BASE}/q/${token}`);
  const publicHtml = await ap.content();
  console.log("   public link:", r.status(), publicHtml.includes("Smile Dental Pune") ? "renders client" : "MISSING");
  for (const banned of ["internalNote", "deliveryCost", "Internal"]) if (publicHtml.includes(banned)) throw new Error("Public page leaks: " + banned);
  const apiAnon = await ap.request.get(`${BASE}/api/quotes/${qid}/pdf`);
  console.log("   anon api pdf status:", apiAnon.status());
  await anon.close();

  step("accept + revise");
  await page.click("text=Revise (new version)");
  await page.waitForURL((u) => !u.toString().endsWith(qid), { timeout: 15000 });
  const v2 = await page.locator("p.eyebrow").first().innerText();
  console.log("   revised:", v2.replace(/\n/g, " "));
  await shot("09-v2");
  await page.goto(quoteUrl);
  const versions = await page.locator("text=A newer version exists").count();
  console.log("   original shows newer-version notice:", versions === 1);

  step("dashboard / clients / catalogue");
  for (const p of ["/dashboard", "/clients", "/catalogue", "/quotes", "/settings"]) {
    const res = await page.goto(BASE + p);
    console.log("  ", p, res.status());
  }
  await page.goto(BASE + "/dashboard");
  await shot("10-dashboard");
  const desk = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const dp = await desk.newPage();
  await dp.goto(`${BASE}/login`);
  await dp.fill("#email", A_EMAIL);
  await dp.fill("#password", A_PASS);
  await dp.click("button[type=submit]");
  await dp.waitForURL("**/today");
  await dp.goto(page.url().includes("/quotes/") ? page.url() : `${BASE}/quotes`);
  await dp.goto(`${BASE}/quotes`);
  await dp.click("ul.card a >> nth=0");
  await dp.waitForSelector("text=Investment");
  await dp.screenshot({ path: `${OUT}/11-desktop-quote.png` });
  await dp.goto(`${BASE}/dashboard`);
  await dp.screenshot({ path: `${OUT}/12-desktop-dashboard.png` });
  await dp.goto(`${BASE}/settings/catalogue`);
  await dp.screenshot({ path: `${OUT}/13-desktop-settings.png` });
  console.log("console/page errors:", errors.length ? errors : "none");
  await browser.close();
})().catch(async (e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
