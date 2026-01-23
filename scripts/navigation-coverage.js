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

  if (obj.tabs) walk(obj.tabs);
  if (obj.navigation) walk(obj.navigation);

  return paths;
}

function main() {
  const root = path.resolve(__dirname, '..');
  const docsJson = JSON.parse(fs.readFileSync(path.join(root, 'docs.json'), 'utf8'));

  const navPaths = extractPagePaths(docsJson);
  let missing = 0;

  for (const pagePath of navPaths) {
    const filePath = path.join(root, pagePath + '.mdx');
    if (!fs.existsSync(filePath)) {
      console.error(`docs.json references "${pagePath}" but file not found: ${pagePath}.mdx`);
      missing++;
    }
  }

  if (missing > 0) {
    console.error(`\n${missing} navigation entry/entries reference missing files.`);
    process.exit(1);
  } else {
    console.log(`All ${navPaths.size} navigation entries have corresponding files.`);
  }
}

main();
