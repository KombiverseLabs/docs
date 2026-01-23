# GitHub Copilot Instructions - kombify Documentation

## Project Context

This is a Mintlify documentation site for the kombify platform. Content is written in MDX with YAML frontmatter. The site configuration lives in `docs.json`.

## Brand Rules

- Always use "kombify" with a lowercase k
- Tool names: "kombify Stack", "kombify Sim", "kombify StackKits", "kombify Sphere"
- The user config file is called `kombination.yaml`

## File Format

Every `.mdx` page must start with YAML frontmatter:

```yaml
---
title: "Page title in sentence case"
description: "One-line summary for SEO"
---
```

## Writing Style

- Second-person voice ("you", not "we" or "the user")
- Sentence-case headings (not Title Case)
- All code blocks must have language tags (```yaml, ```bash, ```go, etc.)
- Internal links use relative paths without `.mdx` extension
- Prerequisites section at top of procedural pages

## Mintlify Components

When writing MDX content, use these components:

```mdx
<Card title="Title" icon="icon-name" href="/path">
  Description text.
</Card>

<CardGroup cols={2}>
  <Card>...</Card>
  <Card>...</Card>
</CardGroup>

<Steps>
  <Step title="Step name">
    Content here.
  </Step>
</Steps>

<Tabs>
  <Tab title="Tab 1">Content</Tab>
  <Tab title="Tab 2">Content</Tab>
</Tabs>

<Accordion title="Expandable section">
  Hidden content.
</Accordion>

<Note>Important information.</Note>
<Warning>Critical warning.</Warning>
<Tip>Helpful suggestion.</Tip>

<CodeGroup>
```bash Title 1
command here
```
```yaml Title 2
config: here
```
</CodeGroup>

<ParamField path="name" type="string" required>
  Parameter description.
</ParamField>

<ResponseField name="field" type="string">
  Response field description.
</ResponseField>
```

## Directory Structure

- `/stack/` - kombify Stack documentation
- `/sim/` - kombify Sim documentation
- `/stackkits/` - kombify StackKits documentation
- `/sphere/` - kombify Sphere documentation
- `/concepts/` - Architecture and design concepts
- `/guides/` - Deployment, auth, self-hosting guides
- `/api-reference/` - API endpoint documentation
- `/integrations/` - Third-party integration guides
- `/snippets/` - Reusable MDX fragments
- `/internal-notes/` - Source material (NEVER publish directly)
- `/tools/` - DEPRECATED, do not use

## docs.json Navigation

When adding pages, update `docs.json`:
- `tabs[].pages[].pages[]` - Add page path (no `.mdx` extension)
- `navigation.pages[].pages[]` - Main sidebar entries

## Code Examples

- Use realistic values matching actual kombify APIs
- Include multiple languages where applicable (bash, JavaScript, Python, Go)
- Show both request and response for API examples
- Configuration examples should use `kombination.yaml` filename

## Do NOT

- Use Title Case for headings
- Skip frontmatter on any MDX file
- Use absolute URLs for internal links
- Add pages to the `/tools/` directory
- Copy content from `internal-notes/` without rewriting
- Use emojis in documentation content
