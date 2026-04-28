#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const failures = [];

for (const file of markdownFiles(root)) {
  const source = stripCodeBlocks(fs.readFileSync(file, "utf8"));
  const relative = path.relative(root, file).replaceAll("\\", "/");

  for (const link of localLinks(source)) {
    const resolved = resolveLocalTarget(file, link.target);
    if (!resolved) {
      failures.push(`${relative}: broken local link ${link.target}`);
    }
  }
}

if (failures.length > 0) {
  console.error("check-links: FAIL");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log("check-links: OK");

function markdownFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (
      entry.name === "node_modules" ||
      entry.name === ".git" ||
      entry.name === ".npm-cache" ||
      entry.name === "_templates" ||
      entry.name === "CLAUDE.md"
    ) {
      continue;
    }

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

function stripCodeBlocks(source) {
  return source.replace(/```[\s\S]*?```/g, "");
}

function localLinks(source) {
  const links = [];
  const markdownLinkPattern = /!?\[[^\]]*]\(([^)]+)\)/g;
  const hrefPattern = /\bhref=["']([^"']+)["']/g;

  for (const match of source.matchAll(markdownLinkPattern)) {
    addLocalLink(links, match[1]);
  }
  for (const match of source.matchAll(hrefPattern)) {
    addLocalLink(links, match[1]);
  }

  return links;
}

function addLocalLink(links, rawTarget) {
  const target = rawTarget.trim().split(/\s+/)[0];
  if (
    target === "" ||
    target.startsWith("#") ||
    /^[a-z][a-z0-9+.-]*:/i.test(target)
  ) {
    return;
  }
  links.push({ target });
}

function resolveLocalTarget(fromFile, target) {
  const withoutHash = target.split("#", 1)[0];
  const withoutQuery = withoutHash.split("?", 1)[0];
  if (withoutQuery === "") return fromFile;
  const decodedTarget = decodeURIComponent(withoutQuery);

  const base = decodedTarget.startsWith("/")
    ? path.join(root, decodedTarget.slice(1))
    : path.resolve(path.dirname(fromFile), decodedTarget);

  for (const candidate of targetCandidates(base)) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function targetCandidates(base) {
  if (path.extname(base)) return [base];
  return [
    base,
    `${base}.mdx`,
    `${base}.md`,
    path.join(base, "index.mdx"),
    path.join(base, "index.md"),
  ];
}
