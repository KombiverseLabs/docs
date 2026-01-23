const { glob } = require('glob');
const fs = require('fs');
const path = require('path');

function extractPagePaths(obj) {
  const paths = new Set();

  function walk(node) {
    if (typeof node === 'string') {
      paths.add(node);
    } else if (Array.isArray(node)) {
      node.forEach(walk);
    } else if (node && typeof node === 'object') {
      if (node.pages) walk(node.pages);
      if (node.tab) walk(node.pages);
      Object.values(node).forEach((val) => {
        if (Array.isArray(val)) walk(val);
      });
    }
  }

  // Extract from tabs
  if (obj.tabs) walk(obj.tabs);
  // Extract from navigation
  if (obj.navigation) walk(obj.navigation);

  return paths;
}

async function main() {
  const root = path.resolve(__dirname, '..');
  const docsJson = JSON.parse(fs.readFileSync(path.join(root, 'docs.json'), 'utf8'));

  const navPaths = extractPagePaths(docsJson);

  // Find all MDX files, excluding non-publishable directories
  const files = await glob('**/*.mdx', {
    cwd: root,
    ignore: [
      'node_modules/**',
      '_templates/**',
      'internal-notes/**',
      'snippets/**',
      'essentials/**',
    ],
  });

  const orphaned = [];

  for (const file of files) {
    const pagePath = file.replace(/\.mdx$/, '');
    if (!navPaths.has(pagePath)) {
      orphaned.push(file);
    }
  }

  if (orphaned.length > 0) {
    console.warn(`${orphaned.length} page(s) not referenced in docs.json navigation:\n`);
    orphaned.forEach((f) => console.warn(`  ${f}`));
    // Exit with warning (non-zero) so CI catches it
    process.exit(1);
  } else {
    console.log(`All ${files.length} published pages are referenced in navigation.`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
