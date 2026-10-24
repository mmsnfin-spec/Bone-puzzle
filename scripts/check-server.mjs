import { readFileSync } from "node:fs";
const base = process.argv[2] || "http://127.0.0.1:5173";
const root = await fetch(base);
const html = await root.text();
if (!root.ok || !/<title>BONE PUZZLE\b/.test(html) || !html.includes('id="root"'))
  throw new Error("App HTML not served");
const assets = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
  .map((match) => match[1])
  .filter((url) => !url.startsWith("data:"));
for (const asset of assets) {
  const response = await fetch(new URL(asset, base));
  if (!response.ok) throw new Error(`HTML asset HTTP failure: ${asset}`);
  if ((response.headers.get("content-type") || "").includes("text/html"))
    throw new Error(`HTML asset unexpectedly returned fallback HTML: ${asset}`);
  await response.arrayBuffer();
}
const { bones } = JSON.parse(
  readFileSync(new URL("../src/data/hand.json", import.meta.url), "utf8"),
);
for (const bone of bones) {
  const response = await fetch(new URL(bone.modelPath, base));
  if (!response.ok) throw new Error(`Model HTTP failure: ${bone.id}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (new TextDecoder().decode(bytes.slice(0, 4)) !== "glTF")
    throw new Error(`Invalid GLB response: ${bone.id}`);
}
console.log(
  `PASS: app HTML, ${assets.length} initial assets and ${bones.length} valid GLB responses from ${base}`,
);
