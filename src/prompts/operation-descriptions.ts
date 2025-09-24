import { FluoraOperation } from '../types/operations.js';

/**
 * Operation descriptions for each Fluora operation
 */
export const operationDescriptions = new Map<FluoraOperation, string>([
  [
    FluoraOperation.SEARCH_FLUORA,
    `
This tool searches for monetized MCP servers on the Fluora marketplace via the Fluora API.

A successful response will return a JSON like this:
[
  {
    "id": "c45d3968-0aa1-4d78-a16e-041372110f23",
    "name": "PDF Shift",
    "description": "A tool to convert website to PDF file.",
    "categories": "PDF, SaaS",
    "verified": false,
    "website_url": "https://pdfshift.io/",
    "mcp_server_url": "https://9krswmmx4a.us-west-2.awsapprunner.com",
    "created_at": "2025-05-16T22:17:44.437+00:00",
    "updated_at": "2025-05-16T22:17:44.437+00:00"
  }
]

A failure response will return an error message with details.
`,
  ],
  [
    FluoraOperation.PRICE_LISTING,
    `
This tool gets pricing information and payment methods for a monetized MCP server on the Fluora marketplace via the Fluora API.

A successful response will return a JSON like this:

{
  "content": [
    {
      "type": "text",
      "text": {
        "items": [
          {
            "id": "1",
            "name": "Convert to PDF",
            "description": "Convert a website to a PDF",
            "price": {
              "amount": 0.1,
              "paymentMethod": "USDC_BASE_SEPOLIA"
            },
            "params": {
              "websiteUrl": "Example: https://en.wikipedia.org/wiki/PDF"
            }
          }
        ]
      }
    }
  ]
}

A failure response will return an error message with details.
`,
  ],
  [
    FluoraOperation.LIST_TOOLS,
    `
This tool lists all available tools for a specific MCP server on the Fluora marketplace via the Fluora API.

A successful response will return a JSON like this:

{
  "tools": [
    {
      "name": "price-listing",
      "inputSchema": {
        "type": "object",
        "properties": {
          "searchQuery": {
            "type": "string"
          }
        },
        "additionalProperties": false,
        "$schema": "http://json-schema.org/draft-07/schema#"
      }
    },
    {
      "name": "payment-methods",
      "inputSchema": {
        "type": "object",
        "properties": {},
        "additionalProperties": false,
        "$schema": "http://json-schema.org/draft-07/schema#"
      }
    },
    {
      "name": "make-purchase",
      "inputSchema": {
        "type": "object",
        "properties": {
          "itemId": {
            "type": "string"
          },
          "params": {
            "type": "object"
          }
        },
        "required": ["itemId"],
        "additionalProperties": false,
        "$schema": "http://json-schema.org/draft-07/schema#"
      }
    }
  ]
}

A failure response will return an error message with details.
`,
  ],
  [
    FluoraOperation.PAYMENT_METHODS,
    `
This tool gets pricing information and payment methods for a monetized MCP server on the Fluora marketplace via the Fluora API.

A successful response will return a JSON like this:

{
  "content": [
    {
      "type": "text",
      "text": {
        "items": [
          {
            "id": "1",
            "name": "Convert to PDF",
            "description": "Convert a website to a PDF",
            "price": {
              "amount": 0.1,
              "paymentMethod": "USDC_BASE_SEPOLIA"
            },
            "params": {
              "websiteUrl": "Example: https://en.wikipedia.org/wiki/PDF"
            }
          }
        ]
      }
    }
  ]
}

A failure response will return an error message with details.
`,
  ],
  [
    FluoraOperation.MAKE_PURCHASE,
    `
Purchase a service from a monetized MCP server using USDC. This sends USDC directly from your agent's wallet to the server's payment address on Base blockchain.

A successful response will return a JSON like this:

{
  "content": [
    {
      "type": "text",
      "text": {
        "purchasableItemId": "1",
        "makePurchaseRequest": {
          "itemId": "1",
          "params": {
            "websiteUrl": "https://www.fluora.ai/alpha/getting-started"
          },
          "signedTransaction": "eyJ4NDAyVmVyc2lvbiI6MSwic2NoZW1lIjoiZXhhY3QiLCJuZXR3b3JrIjoiYmFzZS1zZXBvbGlhIiwicGF5bG9hZCI6eyJzaWduYXR1cmUiOiIweGVlMGZiMTZkYjEzOTkzMmViOTU3MGJiMTkzZmQ3MTk0MDNlYTdjN2Y2YjE0OTkwYTk3NjEwZDVmMDFhNmQ2YjQzZmQ4MDMyOTMxZmVhMDZjNTg5NTQ2OGYzNTMxMjNmMTMyZmYxYWQ1MzFlODM3NTljYzgxMjhlOTMxZDc5NjJmMWMiLCJhdXRob3JpemF0aW9uIjp7ImZyb20iOiIweDNjZTAwQUQ0Zjk4ZTBBODFGMzI5RkI5MWFEMEUxNzczNGYyZEMyMDkiLCJ0byI6IjB4MDY5QjA2ODdDODc5YjhFOTYzM2ZiOUJGZUMzZmVhNjg0YmMyMzhENSIsInZhbHVlIjoiMTAwMDAwIiwidmFsaWRBZnRlciI6IjE3NTI2ODcyODEiLCJ2YWxpZEJlZm9yZSI6IjE3NTI2ODc1ODYiLCJub25jZSI6IjB4ZTk0ZTc1ZmEzMThkM2EzZWQ2NDdiMDA2MmVkZDdjODExNDliMTRmMmY4NThmYjBlYWNiZDQyMGM0N2ZhYWU1MCJ9fX0=",
          "paymentMethod": "USDC_BASE_SEPOLIA"
        },
        "orderId": "63c929d8-2a89-4bf2-a29c-f78e3f6eb85a",
        "toolResult": {
          "pdfs": [
            {
              "type": "pdf",
              "url": "https://pdf-files-guilherme-test.s3.us-west-2.amazonaws.com/pdf-1752687295808-2dhvrd.pdf"
            }
          ]
        }
      }
    }
  ],
  "payment": {
    "paymentMessage": "This transaction cost 0.1 USDC"
  }
}

A failure response will return an error message with details.
`,
  ],
]);

