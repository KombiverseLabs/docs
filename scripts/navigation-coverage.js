#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const docsJsonPath = path.join(root, "docs.json");
const failures = [];

if (!fs.existsSync(docsJsonPath)) {
  console.error("navigation-coverage: FAIL");
  console.error("  - docs.json is missing");
  process.exit(1);
}

const docsJson = JSON.parse(fs.readFileSync(docsJsonPath, "utf8"));
const pages = new Set();
collectPages(docsJson.navigation, pages);

for (const page of [...pages].sort()) {
  if (/^[a-z][a-z0-9+.-]*:/i.test(page)) continue;
  if (!resolvePage(page)) {
    failures.push(`docs.json references missing page: ${page}`);
  }
}

if (failures.length > 0) {
  console.error("navigation-coverage: FAIL");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(`navigation-coverage: OK (${pages.size} pages)`);

function collectPages(value, pages) {
  if (typeof value === "string") {
    pages.add(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectPages(item, pages);
    return;
  }
  if (value && typeof value === "object") {
    if (Array.isArray(value.pages)) collectPages(value.pages, pages);
    if (Array.isArray(value.tabs)) collectPages(value.tabs, pages);
    if (Array.isArray(value.groups)) collectPages(value.groups, pages);
  }
}

function resolvePage(page) {
  const target = page.replace(/^\/+/, "");
  const base = path.join(root, target);
  for (const candidate of [
    `${base}.mdx`,
    `${base}.md`,
    path.join(base, "index.mdx"),
    path.join(base, "index.md"),
  ]) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}
