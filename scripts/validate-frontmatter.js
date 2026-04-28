#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const matter = require("gray-matter");

const root = process.cwd();
const failures = [];

for (const file of markdownFiles(root)) {
  if (!file.endsWith(".mdx")) continue;

  const relative = path.relative(root, file).replaceAll("\\", "/");
  const source = fs.readFileSync(file, "utf8");

  if (!source.startsWith("---")) {
    failures.push(`${relative}: missing frontmatter block`);
    continue;
  }

  try {
    matter(source);
  } catch (error) {
    failures.push(`${relative}: invalid frontmatter (${error.message})`);
  }
}

if (failures.length > 0) {
  console.error("validate-frontmatter: FAIL");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log("validate-frontmatter: OK");

function markdownFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git" || entry.name === ".npm-cache") continue;

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...markdownFiles(fullPath));
      continue;
    }
    if (/\.(md|mdx)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}
