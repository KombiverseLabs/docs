#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  TextContent,
} from "@modelcontextprotocol/sdk/types.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import fetch from "node-fetch";

const API_KEY = process.env.MINTLIFY_API_KEY;
const PROJECT_ID = process.env.MINTLIFY_PROJECT_ID;
const API_BASE = "https://api.mintlify.com/v1";

if (!API_KEY || !PROJECT_ID) {
  console.error("Missing MINTLIFY_API_KEY or MINTLIFY_PROJECT_ID environment variables");
  process.exit(1);
}

const server = new Server({
  name: "mintlify-mcp",
  version: "1.0.0",
});

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "update_page",
        description: "Update a documentation page in Mintlify",
        inputSchema: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "Page path (e.g., /guides/deployment)",
            },
            content: {
              type: "string",
              description: "Page content in MDX format",
            },
            title: {
              type: "string",
              description: "Page title",
            },
          },
          required: ["path", "content"],
        },
      },
      {
        name: "get_page",
        description: "Get a documentation page from Mintlify",
        inputSchema: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "Page path (e.g., /guides/deployment)",
            },
          },
          required: ["path"],
        },
      },
      {
        name: "list_pages",
        description: "List all pages in the Mintlify project",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request;

  try {
    if (name === "update_page") {
      const { path, content, title } = args;
      const response = await fetch(
        `${API_BASE}/projects/${PROJECT_ID}/pages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            path,
            content,
            title: title || path,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Mintlify API error: ${response.status} - ${error}`);
      }

      const result = await response.json();
      return {
        content: [
          {
            type: "text",
            text: `Page updated successfully: ${path}`,
          },
        ],
      };
    } else if (name === "get_page") {
      const { path } = args;
      const response = await fetch(
        `${API_BASE}/projects/${PROJECT_ID}/pages?path=${encodeURIComponent(path)}`,
        {
          headers: {
            Authorization: `Bearer ${API_KEY}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Mintlify API error: ${response.status}`);
      }

      const result = await response.json();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } else if (name === "list_pages") {
      const response = await fetch(
        `${API_BASE}/projects/${PROJECT_ID}/pages`,
        {
          headers: {
            Authorization: `Bearer ${API_KEY}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Mintlify API error: ${response.status}`);
      }

      const result = await response.json();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error.message}`,
          isError: true,
        },
      ],
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
