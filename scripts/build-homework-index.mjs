import { readdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { validateFuturePackage, validateFutureIndex } from "./lib/gokcen-architecture-v1-package.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "docs", "homeworks");
const indexPath = join(root, "index.json");
const directories = (await readdir(root, { withFileTypes: true })).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
const packages = [];
for (const id of directories) {
  const pkg = JSON.parse(await readFile(join(root, id, "homework.json"), "utf8"));
  validateFuturePackage(pkg);
  packages.push(pkg);
}
const index = packages.sort((left, right) => right.date.localeCompare(left.date) || left.id.localeCompare(right.id)).map((pkg) => ({
  id: pkg.id,
  date: pkg.date,
  title: pkg.title,
  path: `./${pkg.id}/homework.json`,
  policyVersion: pkg.policyVersion,
  templateContractVersion: pkg.templateContractVersion,
  assessmentPolicyVersion: pkg.assessmentPolicyVersion
}));
validateFutureIndex(index);
const rendered = `${JSON.stringify(index, null, 2)}\n`;
if (process.argv.includes("--check")) {
  const current = await readFile(indexPath, "utf8");
  if (current !== rendered) throw new Error("docs/homeworks/index.json is not the deterministic generated index");
  console.log(`Future index is deterministic (${index.length} package(s)).`);
} else {
  await writeFile(indexPath, rendered);
  console.log(`Generated future index (${index.length} package(s)).`);
}
