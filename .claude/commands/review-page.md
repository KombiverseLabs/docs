# Review a documentation page

Review an existing page for quality, accuracy, and Mintlify best practices.

## Arguments
- $ARGUMENTS: The page path to review (e.g., "stack/overview" or "concepts/architecture")

## Instructions

1. Read the specified page

2. Check against project standards:
   - Frontmatter: has title and description?
   - Voice: uses second-person ("you")?
   - Headings: sentence-case (not Title Case)?
   - Code blocks: all have language tags?
   - Links: use relative paths without .mdx?
   - Components: appropriate use of Cards, Steps, Accordions?
   - Brand: "kombify" (lowercase k), correct tool names?

3. Check content quality:
   - Is there a clear introduction explaining what this page covers?
   - Are prerequisites listed for procedural content?
   - Are code examples realistic and complete?
   - Is there a "Next steps" section with navigation cards?
   - Is the content appropriate depth (not too shallow, not too verbose)?

4. Cross-reference with internal-notes:
   - Is the published content accurate vs source material?
   - Is anything outdated or missing?

5. Check technical accuracy:
   - Do internal links resolve to existing pages?
   - Are API endpoints/params correct?
   - Do configuration examples match actual tool behavior?

6. Report findings with specific line references and suggested fixes

## User input
$ARGUMENTS
