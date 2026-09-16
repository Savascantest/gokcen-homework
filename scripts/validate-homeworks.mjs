import { readdir, readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { validateFutureIndex, validateFuturePackage } from "./lib/gokcen-architecture-v1-package.mjs";

const docs = join(dirname(fileURLToPath(import.meta.url)), "..", "docs");
const root = join(docs, "homeworks");
await stat(join(docs, "index.html"));
const historicalApp = await readFile(join(docs, "app.js"), "utf8");
if (!historicalApp.includes("gokcen-homework-full-v1")) throw new Error("Historical BrowserProgress key is not preserved");
const index = JSON.parse(await readFile(join(root, "index.json"), "utf8"));
validateFutureIndex(index);
for (const entry of index) {
  const file = join(root, entry.id, "homework.json");
  await stat(file);
  const pkg = JSON.parse(await readFile(file, "utf8"));
  validateFuturePackage(pkg);
  if (pkg.id !== entry.id || pkg.date !== entry.date || pkg.title !== entry.title) throw new Error(`Index entry does not match ${entry.id}`);
}
const folders = (await readdir(root, { withFileTypes: true })).filter((item) => item.isDirectory()).map((item) => item.name);
for (const folder of folders) {
  if (!index.some((entry) => entry.id === folder)) throw new Error(`Unindexed future homework directory: ${folder}`);
}
console.log(`Validated historical workspace compatibility and ${index.length} future Gökçen package(s).`);
