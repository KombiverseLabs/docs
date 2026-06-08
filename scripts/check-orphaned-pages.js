#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const docsJsonPath = path.join(root, "docs.json");

if (!fs.existsSync(docsJsonPath)) {
  console.error("check-orphaned-pages: FAIL");
  console.error("  - docs.json is missing");
  process.exit(1);
}

const referenced = new Set();
collectPages(JSON.parse(fs.readFileSync(docsJsonPath, "utf8")).navigation, referenced);

const publicPages = markdownFiles(root)
  .map((file) => path.relative(root, file).replaceAll("\\", "/").replace(/\.(md|mdx)$/, ""))
  .filter((file) => file !== "index" && !file.startsWith("internal-notes/") && !file.startsWith("_"));

const orphans = publicPages.filter((file) => !referenced.has(file));
if (orphans.length > 0) {
  console.warn(`check-orphaned-pages: WARN (${orphans.length} public pages are not in docs.json navigation)`);
  for (const orphan of orphans.slice(0, 25)) console.warn(`  - ${orphan}`);
  if (orphans.length > 25) console.warn(`  - ... ${orphans.length - 25} more`);
} else {
  console.log("check-orphaned-pages: OK");
}

function collectPages(value, pages) {
  if (typeof value === "string") {
    pages.add(value.replace(/^\/+/, ""));
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

function markdownFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || ["node_modules", "internal-notes"].includes(entry.name)) continue;
    if (["AGENTS.md", "CLAUDE.md", "README.md", "ROADMAP.md", "STATUS.md", "AUDIT-REPORT.md"].includes(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...markdownFiles(fullPath));
    } else if (/\.(md|mdx)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}
