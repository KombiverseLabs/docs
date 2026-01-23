const { glob } = require('glob');
const matter = require('gray-matter');
const fs = require('fs');
const path = require('path');

async function main() {
  const root = path.resolve(__dirname, '..');
  const files = await glob('**/*.mdx', {
    cwd: root,
    ignore: ['node_modules/**', '_templates/**', 'internal-notes/**'],
  });

  let errors = 0;

  for (const file of files) {
    const content = fs.readFileSync(path.join(root, file), 'utf8');
    const { data } = matter(content);

    const missing = [];
    if (!data.title) missing.push('title');
    if (!data.description) missing.push('description');

    if (missing.length > 0) {
      console.error(`${file}: missing frontmatter fields: ${missing.join(', ')}`);
      errors++;
    }
  }

  if (errors > 0) {
    console.error(`\n${errors} file(s) with missing frontmatter.`);
    process.exit(1);
  } else {
    console.log(`All ${files.length} MDX files have valid frontmatter.`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
