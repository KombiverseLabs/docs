# Validate documentation

Run all validation checks on the documentation and report results.

## Instructions

Run these validation scripts in sequence and report a summary:

1. `node scripts/validate-frontmatter.js` - Check all MDX pages have title + description
2. `node scripts/check-links.js` - Find broken internal links
3. `node scripts/check-orphaned-pages.js` - Find pages not in docs.json navigation
4. `node scripts/navigation-coverage.js` - Find docs.json entries pointing to missing files

Report:
- Total pages checked
- Number of issues per category
- Specific files/lines with problems
- Suggested fixes for each issue
