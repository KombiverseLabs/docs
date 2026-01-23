# Sync content from internal notes

Convert internal documentation into published Mintlify pages.

## Arguments
- $ARGUMENTS: The internal-notes file path or topic to convert

## Instructions

1. Read the specified internal-notes file(s):
   - If a path is given, read that file directly
   - If a topic is given, search `internal-notes/MASTER_INDEX.md` to locate relevant files
   - Check both `internal-notes/kombify/` (technical) and `internal-notes/marketing/` (user-facing)

2. Determine where the published page should live:
   - Match the content type to the correct directory
   - Check if a page already exists that should be updated vs creating new

3. Rewrite for public audience:
   - Translate German content to English
   - Remove internal references, TODOs, and draft markers
   - Use second-person voice ("you")
   - Add proper Mintlify components for visual hierarchy
   - Include realistic code examples
   - Add prerequisites where appropriate

4. NEVER copy-paste from internal notes directly. Always rewrite.

5. Create/update the MDX page with proper frontmatter

6. Update docs.json navigation if adding a new page

7. Run `node scripts/validate-frontmatter.js && node scripts/navigation-coverage.js`

## User input
$ARGUMENTS
