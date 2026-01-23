# Add API endpoint documentation

Create API reference pages for kombify endpoints.

## Arguments
- $ARGUMENTS: The tool name (stack/sim/stackkits/sphere) and endpoint details

## Instructions

1. Identify the target tool and endpoints from user input

2. Check source material:
   - `internal-notes/kombify/tools/{tool}/` for API specs
   - `internal-notes/kombify/INTER_MODULE_CONTRACTS.md` for contracts
   - Existing pages in `api-reference/` for patterns

3. For each endpoint, create an MDX page using `_templates/api-endpoint.mdx` as base:
   - Use `<ParamField>` for request parameters (path, query, body)
   - Use `<ResponseField>` for response schema
   - Use `<RequestExample>` with cURL + JavaScript examples
   - Use `<ResponseExample>` with success + error responses
   - Include authentication requirements
   - Document rate limits if applicable

4. Place pages in `api-reference/{tool}/` directory

5. Add pages to the "API Reference" tab in docs.json under the correct group:
   ```json
   {
     "group": "kombify {Tool} API",
     "pages": ["api-reference/{tool}/endpoint-name"]
   }
   ```

6. Run validation: `node scripts/navigation-coverage.js`

## User input
$ARGUMENTS
