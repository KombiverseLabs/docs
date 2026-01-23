# Fill navigation gaps

Create stub pages for docs.json entries that reference missing files.

## Instructions

1. Run `node scripts/navigation-coverage.js` to identify missing pages

2. For each missing page, determine its type from context:
   - Pages under `stack/install/` → installation guides (use `_templates/guide.mdx`)
   - Pages under `*/overview` → tool overviews (use `_templates/tool-overview.mdx`)
   - Pages under `api-reference/` → API docs (use `_templates/api-endpoint.mdx`)
   - Pages under `concepts/` → concept explanations (use `_templates/concept.mdx`)
   - Pages under `integrations/` → integration guides (use `_templates/guide.mdx`)
   - Other pages → general guide template

3. Check `internal-notes/` for source material on each topic

4. Create each page with:
   - Proper frontmatter (title derived from the path, description from context)
   - Appropriate template structure
   - Content from internal-notes if available, or clear TODO placeholders
   - Proper Mintlify components

5. After creating all pages, run full validation:
   `node scripts/validate-frontmatter.js && node scripts/check-links.js && node scripts/navigation-coverage.js`

6. Report what was created and what still needs content
