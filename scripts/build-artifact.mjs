// Inlines the artifact build (dist-artifact/) into one HTML body fragment for artifact hosting.
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const dir = "dist-artifact/assets";
const files = readdirSync(dir);
const js = files.filter((f) => f.endsWith(".js")).map((f) => readFileSync(join(dir, f), "utf8"));
const css = files.filter((f) => f.endsWith(".css")).map((f) => readFileSync(join(dir, f), "utf8")).join("\n");
if (js.length !== 1) throw new Error(`Expected a single JS bundle, found ${js.length}`);
const out = process.argv[2] ?? "dist-artifact/connectsphere.html";
const html = `<title>ConnectSphere</title>
<meta name="description" content="Chapter compatibility and referral intelligence — demo with fictional members.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap">
<style>${css}</style>
<div id="root"></div>
<script type="module">${js[0].replace(/<\/script/gi, "<\\/script")}</script>
`;
writeFileSync(out, html);
console.log(`Wrote ${out} (${(html.length / 1024).toFixed(0)} KB)`);
