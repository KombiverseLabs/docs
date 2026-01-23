# Create a new documentation page

Create a new Mintlify documentation page based on user input.

## Arguments
- $ARGUMENTS: The page topic, target directory, and any specific requirements

## Instructions

1. Determine the correct directory from the project structure:
   - `/stack/` - kombify Stack docs
   - `/sim/` - kombify Sim docs
   - `/stackkits/` - kombify StackKits docs
   - `/sphere/` - kombify Sphere docs
   - `/concepts/` - Architecture and design concepts
   - `/guides/` - How-to guides
   - `/api-reference/` - API endpoint docs
   - `/integrations/` - Third-party integrations

2. Select the appropriate template from `_templates/`:
   - `tool-overview.mdx` - For tool landing/overview pages
   - `guide.mdx` - For procedural how-to content
   - `api-endpoint.mdx` - For API endpoint documentation
   - `concept.mdx` - For concept explanations

3. Check `internal-notes/` for source material on the topic:
   - `internal-notes/kombify/tools/{tool}/` for tool-specific content
   - `internal-notes/marketing/concepts/` for concept explanations
   - `internal-notes/MASTER_INDEX.md` for an index of available material

4. Read an existing page in the same section for structural reference

5. Create the new `.mdx` file with:
   - Required frontmatter (title + description)
   - Content rewritten for a public developer audience
   - Proper Mintlify components (Cards, Steps, CodeGroup, etc.)
   - Realistic code examples with language tags
   - Internal links using relative paths without `.mdx`

6. Add the page path (without `.mdx`) to `docs.json` in the correct tab/group

7. Run validation: `node scripts/validate-frontmatter.js && node scripts/check-links.js && node scripts/navigation-coverage.js`

## User input
$ARGUMENTS
