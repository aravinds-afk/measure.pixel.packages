// End-to-end smoke test of every page in DEMO mode (desktop + mobile).
// Usage: npm run build && npx vite preview --port 4173 & npm run test:e2e
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const BASE = process.env.E2E_BASE ?? "http://localhost:4173";
const OUT = process.env.E2E_OUT ?? "e2e/screenshots";
const EXEC = process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium";
mkdirSync(OUT, { recursive: true });

const results = [];
const check = (name, ok, detail = "") => { results.push({ name, ok, detail }); console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`); };

const browser = await chromium.launch({ executablePath: EXEC });

async function session(persona, viewport) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/fonts\.g/.test(m.text())) errors.push(m.text()); });
  await page.goto(BASE);
  await page.evaluate(() => localStorage.clear());
  await page.goto(BASE);
  await page.getByRole("button", { name: new RegExp(persona) }).click();
  await page.waitForSelector("main h1");
  return { ctx, page, errors };
}

const PRIYA = "00000000-0000-4000-8000-000000000001";
const ARJUN = "00000000-0000-4000-8000-000000000002";

// ---- member journey (desktop) ----
{
  const { ctx, page, errors } = await session("Priya Raman", { width: 1366, height: 900 });
  check("login as demo member shows dashboard", await page.getByText("Top five potential referral partners").isVisible());
  check("demo data is labelled", await page.getByText("Demo data").first().isVisible());
  await page.screenshot({ path: `${OUT}/01-dashboard.png`, fullPage: true });

  await page.goto(`${BASE}/members`);
  await page.waitForSelector("main a[href^='/members/']");
  const cards = await page.locator("main a[href^='/members/']").count();
  check("directory lists members", cards >= 16, `${cards} cards`);
  await page.getByPlaceholder("Search by name").fill("accountant");
  await page.waitForTimeout(150);
  check("directory search filters", (await page.locator("main a[href^='/members/']").count()) <= 3);
  await page.screenshot({ path: `${OUT}/02-directory.png` });

  await page.goto(`${BASE}/compatibility/${PRIYA}/${ARJUN}`);
  await page.waitForSelector("text=Score breakdown");
  check("report shows exceptional match", await page.getByText("Exceptional Strategic Match").first().isVisible());
  check("report has reciprocal panels", (await page.getByText(/Referrals .* can give/).count()) === 2);
  check("report has trigger intelligence", await page.getByText("Referral trigger intelligence").isVisible());
  check("report has editable scripts", (await page.getByLabel("WhatsApp introduction").count()) === 1);
  await page.screenshot({ path: `${OUT}/03-report.png`, fullPage: true });
  await page.getByRole("button", { name: "Save" }).first().click();
  await page.getByText("Saved to your connections").waitFor();
  await page.getByRole("button", { name: "Useful" }).first().click();
  await page.getByText(/marked useful/).waitFor();
  check("save connection + feedback from report", true);

  await page.goto(`${BASE}/compatibility/${PRIYA}/00000000-0000-4000-8000-000000000017`);
  await page.waitForSelector("text=Score breakdown");
  check("sparse profile shows exploratory/low confidence", await page.getByText("Exploratory assessment").isVisible());

  await page.goto(`${BASE}/spheres`);
  await page.waitForSelector("text=Contact sphere explorer");
  check("spheres show missing professions", await page.getByText("Business Lawyer").first().isVisible());
  await page.screenshot({ path: `${OUT}/04-spheres.png`, fullPage: true });

  await page.goto(`${BASE}/find`);
  await page.getByRole("button", { name: "cash flow problems" }).click();
  await page.waitForSelector("text=can help");
  check("referral partner search returns Kavya", (await page.locator("main").innerText()).includes("Kavya Iyer"));
  await page.goto(`${BASE}/find?tab=next`);
  await page.waitForSelector("text=Full report & scripts");
  check("find my next referral", true);

  await page.goto(`${BASE}/meetings?with=${ARJUN}`);
  await page.waitForSelector("text=Five discovery questions");
  await page.getByRole("button", { name: "Save one-to-one" }).click();
  await page.waitForSelector("text=Record outcomes");
  await page.getByLabel("Status").selectOption("completed");
  await page.getByRole("button", { name: "Save outcome" }).click();
  await page.getByText("Meeting updated").waitFor();
  check("one-to-one planned and outcome recorded", true);
  await page.screenshot({ path: `${OUT}/05-meeting.png`, fullPage: true });

  await page.goto(`${BASE}/saved`);
  await page.waitForSelector("text=Saved connections");
  check("saved connection advanced to one-to-one completed", (await page.getByLabel("Status").first().inputValue()) === "one_to_one_completed");

  await page.goto(`${BASE}/referrals`);
  await page.getByRole("button", { name: "Record a referral" }).click();
  await page.getByRole("dialog").getByRole("combobox").nth(1).selectOption({ label: "Arjun Mehta" });
  await page.getByRole("dialog").getByRole("checkbox").check();
  await page.getByRole("dialog").getByRole("button", { name: "Record referral" }).click();
  await page.getByText("Referral recorded").waitFor();
  check("referral recorded with consent", true);

  await page.goto(`${BASE}/members/${PRIYA}`);
  await page.getByRole("button", { name: "Edit profile" }).click();
  await page.getByRole("button", { name: "Save profile" }).click();
  await page.waitForSelector("text=Business profile");
  check("own profile editable", true);
  await page.goto(`${BASE}/admin/members`);
  await page.waitForSelector("main h1");
  check("member cannot open admin page", !(await page.getByText("Member management").first().isVisible().catch(() => false)) || (await page.locator("main h1").innerText()) !== "Member management");
  await page.goto(`${BASE}/settings`);
  await page.waitForSelector("text=Privacy & account settings");
  check("no runtime errors (member)", errors.length === 0, errors.slice(0, 3).join(" | "));
  await ctx.close();
}

// ---- admin journey ----
{
  const { ctx, page, errors } = await session("Arjun Mehta", { width: 1366, height: 900 });
  await page.goto(`${BASE}/admin/import`);
  await page.waitForSelector("text=Upload a member export");
  const sample = await page.locator("a[download]").getAttribute("href");
  const csv = decodeURIComponent(sample.split(",").slice(1).join(","));
  await page.locator("input[type=file]").setInputFiles({ name: "sample.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
  await page.getByRole("button", { name: "Validate & preview" }).click();
  await page.waitForSelector("text=Validation results");
  const txt = await page.locator("main").innerText();
  check("import preview flags duplicate + error rows", txt.includes("Duplicate in file") && txt.includes("Error — skipped"));
  await page.screenshot({ path: `${OUT}/06-import-preview.png`, fullPage: true });
  await page.getByRole("button", { name: /Import \d+ members/ }).click();
  await page.waitForSelector("text=Import complete");
  check("import commit created members", (await page.locator("main").innerText()).includes("Created"));
  await page.goto(`${BASE}/members?q=Fernandes`);
  check("imported member appears in directory", await page.getByText("Asha Fernandes").first().waitFor().then(() => true, () => false));

  await page.goto(`${BASE}/admin/members?tab=scoring`);
  await page.getByLabel("Ideal customer profile overlap weight").fill("30");
  check("weights must total 100", await page.getByRole("button", { name: "Save" }).isDisabled());
  await page.getByLabel("Ideal customer profile overlap weight").fill("20");
  await page.goto(`${BASE}/admin/members`);
  await page.waitForSelector("text=member records");
  await page.screenshot({ path: `${OUT}/07-admin.png` });
  await page.getByRole("row", { name: /Tara Wilson/ }).getByRole("button", { name: "Deactivate" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Deactivate" }).click();
  await page.getByText("Member deactivated").waitFor();
  check("admin deactivates member", true);
  await page.goto(`${BASE}/admin/members?tab=audit`);
  check("audit log records actions", await page.getByText("member.status_changed").first().waitFor().then(() => true, () => false));
  await page.goto(`${BASE}/analytics`);
  await page.waitForSelector("text=Member participation");
  check("analytics visible to admin", true);
  await page.screenshot({ path: `${OUT}/08-analytics.png`, fullPage: true });
  check("no runtime errors (admin)", errors.length === 0, errors.slice(0, 3).join(" | "));
  await ctx.close();
}

// ---- mobile layout ----
{
  const { ctx, page, errors } = await session("Priya Raman", { width: 390, height: 844 });
  const overflow = async () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  for (const path of ["/", "/members", `/compatibility/${PRIYA}/${ARJUN}`, "/spheres", "/meetings", "/referrals", "/find", "/settings"]) {
    await page.goto(BASE + path);
    await page.waitForSelector("main h1");
    await page.waitForTimeout(150);
    const o = await overflow();
    check(`mobile ${path} has no horizontal overflow`, o <= 1, `${o}px`);
  }
  await page.goto(`${BASE}/compatibility/${PRIYA}/${ARJUN}`);
  await page.waitForSelector("text=Score breakdown");
  await page.screenshot({ path: `${OUT}/09-mobile-report.png`, fullPage: false });
  await page.getByLabel("Open menu").click();
  check("mobile navigation opens", await page.getByRole("link", { name: "Contact spheres" }).last().isVisible());
  check("no runtime errors (mobile)", errors.length === 0, errors.slice(0, 3).join(" | "));
  await ctx.close();
}

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
