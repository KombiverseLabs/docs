#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const failures = [];

for (const file of markdownFiles(root)) {
  const relative = path.relative(root, file).replaceAll("\\", "/");
  const source = fs.readFileSync(file, "utf8");
  let insideFence = false;
  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^\s*```([^`]*)$/);
    if (!match) continue;

    if (insideFence) {
      insideFence = false;
      continue;
    }

    insideFence = true;
    const info = match[1].trim();
    if (info === "") {
      failures.push(`${relative}: code fence without language`);
    }
  }
}

if (failures.length > 0) {
  console.warn("validate-code-examples: WARN");
  for (const failure of failures.slice(0, 25)) console.warn(`  - ${failure}`);
  if (failures.length > 25) console.warn(`  - ... ${failures.length - 25} more`);
} else {
  console.log("validate-code-examples: OK");
}

function markdownFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || ["node_modules", "internal-notes"].includes(entry.name)) continue;
    if (["AGENTS.md", "CLAUDE.md", "README.md", "ROADMAP.md", "STATUS.md", "AUDIT-REPORT.md"].includes(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...markdownFiles(fullPath));
    else if (/\.(md|mdx)$/.test(entry.name)) files.push(fullPath);
  }
  return files;
}
