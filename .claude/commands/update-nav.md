# Update docs.json navigation

Add, remove, or reorganize pages in the docs.json navigation structure.

## Arguments
- $ARGUMENTS: What navigation changes to make

## Instructions

1. Read the current `docs.json` to understand the structure

2. The config has these navigation sections:
   - `tabs` array: Product-area tabs (Stack, Sim, StackKits, Sphere, API Reference)
     - Each tab has `tab` (name), `icon`, and `pages` (array of group objects)
     - Each group has `group` (name) and `pages` (array of page paths)
   - `navigation.pages`: Main sidebar (Getting Started, Concepts, Integrations, Resources)
   - `anchors`: External links

3. Apply the requested changes:
   - Adding pages: insert path (without .mdx) in the correct group
   - Adding groups: add new `{"group": "Name", "pages": [...]}` object
   - Reordering: move entries within their arrays
   - Removing: delete the path string from the pages array

4. Verify the changes:
   - All referenced page paths have corresponding .mdx files
   - No duplicate entries
   - Logical grouping (overview first, then specifics)

5. Run `node scripts/navigation-coverage.js` to confirm

## User input
$ARGUMENTS
