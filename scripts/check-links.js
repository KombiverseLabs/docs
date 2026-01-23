const { glob } = require('glob');
const fs = require('fs');
const path = require('path');

async function main() {
  const root = path.resolve(__dirname, '..');
  const files = await glob('**/*.mdx', {
    cwd: root,
    ignore: ['node_modules/**', '_templates/**', 'internal-notes/**'],
  });

  // Collect all existing page paths (without .mdx extension)
  const existingPages = new Set(files.map((f) => f.replace(/\.mdx$/, '')));

  let errors = 0;

  // Patterns for internal links
  const hrefPattern = /href="(\/[^"#?]+)"/g;
  const mdLinkPattern = /\]\((\/[^)#?\s]+)\)/g;

  for (const file of files) {
    const content = fs.readFileSync(path.join(root, file), 'utf8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const patterns = [hrefPattern, mdLinkPattern];

      for (const pattern of patterns) {
        pattern.lastIndex = 0;
        let match;
        while ((match = pattern.exec(line)) !== null) {
          const linkPath = match[1].replace(/^\//, ''); // Remove leading slash

          // Skip external-looking paths, images, and anchors
          if (linkPath.startsWith('http') || linkPath.match(/\.(png|jpg|svg|gif|ico|json)$/)) {
            continue;
          }

          // Check if the target MDX file exists
          if (!existingPages.has(linkPath)) {
            const fullPath = path.join(root, linkPath + '.mdx');
            if (!fs.existsSync(fullPath)) {
              console.error(`${file}:${i + 1}: broken link to "/${linkPath}"`);
              errors++;
            }
          }
        }
      }
    }
  }

  if (errors > 0) {
    console.error(`\n${errors} broken internal link(s) found.`);
    process.exit(1);
  } else {
    console.log(`All internal links valid across ${files.length} files.`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
