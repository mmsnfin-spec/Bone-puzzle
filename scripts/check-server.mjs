import { readFileSync } from "node:fs";
const base = process.argv[2] || "http://127.0.0.1:5173";
const root = await fetch(base);
if (!root.ok || !(await root.text()).includes("BONE PUZZLE 3D"))
  throw new Error("App HTML not served");
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
  `PASS: app HTML and ${bones.length} valid GLB responses from ${base}`,
);
