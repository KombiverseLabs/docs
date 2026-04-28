#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const failures = [];

for (const file of markdownFiles(root)) {
  const relative = path.relative(root, file).replaceAll("\\", "/");
  const source = fs.readFileSync(file, "utf8");
  if (!source.startsWith("---")) {
    failures.push(`${relative}: missing frontmatter`);
    continue;
  }
  const frontmatter = source.split("---", 3)[1] || "";
  if (!/\btitle\s*:/.test(frontmatter)) failures.push(`${relative}: missing title frontmatter`);
  if (!/\bdescription\s*:/.test(frontmatter)) {
    console.warn(`check-seo: WARN ${relative}: missing description frontmatter`);
  }
}

if (failures.length > 0) {
  console.error("check-seo: FAIL");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log("check-seo: OK");

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
