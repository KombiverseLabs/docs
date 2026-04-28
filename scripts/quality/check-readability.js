#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const failures = [];

for (const file of markdownFiles(root)) {
  const relative = path.relative(root, file).replaceAll("\\", "/");
  const source = fs.readFileSync(file, "utf8");
  const longLines = source
    .split(/\r?\n/)
    .map((line, index) => ({ line, index: index + 1 }))
    .filter(({ line }) => line.length > 240 && !line.startsWith("|") && !line.includes("http"));
  if (longLines.length > 0) {
    failures.push(`${relative}: ${longLines.length} very long prose line(s)`);
  }
}

if (failures.length > 0) {
  console.warn("check-readability: WARN");
  for (const failure of failures.slice(0, 25)) console.warn(`  - ${failure}`);
} else {
  console.log("check-readability: OK");
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
