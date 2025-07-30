import { z } from 'zod';

/**
 * Fluora operation types - following fluora-mcp naming standards
 */
export enum FluoraOperation {
  // Discovery Operations
  SEARCH_FLUORA = 'search-fluora',
  LIST_SERVERS = 'list-servers',
  GET_SERVER_INFO = 'get-server-info',

  // Monetization Operations (from MonetizedMCPServer)
  PRICE_LISTING = 'price-listing',
  PAYMENT_METHODS = 'payment-methods',
  MAKE_PURCHASE = 'make-purchase',

  // Tool Execution Operations
  CALL_SERVER_TOOL = 'call-server-tool',
  LIST_TOOLS = 'list-tools',

  // Management Operations
  GET_PURCHASE_HISTORY = 'get-purchase-history',
  VALIDATE_PAYMENT = 'validate-payment',
}

/**
 * Payment methods supported by the system (from monetized-mcp-sdk)
 */
export enum PaymentMethods {
  USDC_BASE_SEPOLIA = 'USDC_BASE_SEPOLIA',
  USDC_BASE_MAINNET = 'USDC_BASE_MAINNET',
}

/**
 * Tool parameters schema using discriminated union for type safety
 */
export const toolParamsSchema = z.discriminatedUnion('operation', [
  // Discovery Operations
  z.object({
    operation: z.literal(FluoraOperation.SEARCH_FLUORA),
    name: z.string().optional(),
  }),

  z.object({
    operation: z.literal(FluoraOperation.LIST_SERVERS),
    category: z.string().optional(),
  }),

  z.object({
    operation: z.literal(FluoraOperation.GET_SERVER_INFO),
    serverId: z.string(),
  }),

  // Monetization Operations
  z.object({
    operation: z.literal(FluoraOperation.PRICE_LISTING),
    serverId: z.string(),
    mcpServerUrl: z.string(),
  }),

  z.object({
    operation: z.literal(FluoraOperation.PAYMENT_METHODS),
    serverId: z.string(),
    mcpServerUrl: z.string(),
  }),

  z.object({
    operation: z.literal(FluoraOperation.MAKE_PURCHASE),
    serverId: z.string(),
    mcpServerUrl: z.string(),
    itemPrice: z.string().regex(/^\d*\.?\d+$/, 'Invalid price format'),
    serverWalletAddress: z
      .string()
      .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid wallet address'),
    paymentMethod: z.nativeEnum(PaymentMethods),
    itemId: z.string().optional(),
    args: z.record(z.any()).optional(),
  }),

  // Tool Execution Operations
  z.object({
    operation: z.literal(FluoraOperation.CALL_SERVER_TOOL),
    serverId: z.string(),
    mcpServerUrl: z.string(),
    toolName: z.string(),
    args: z.record(z.any()),
  }),

  z.object({
    operation: z.literal(FluoraOperation.LIST_TOOLS),
    serverId: z.string(),
    mcpServerUrl: z.string(),
  }),

  // Management Operations
  z.object({
    operation: z.literal(FluoraOperation.GET_PURCHASE_HISTORY),
    userAddress: z
      .string()
      .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid address')
      .optional(),
  }),

  z.object({
    operation: z.literal(FluoraOperation.VALIDATE_PAYMENT),
    transactionHash: z
      .string()
      .regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid transaction hash'),
    paymentMethod: z.nativeEnum(PaymentMethods),
  }),
]);

/**
 * Create a Zod enum schema for FluoraOperation
 */
export const FluoraOperationSchema = z.nativeEnum(FluoraOperation);

/**
 * Create a map schema where keys are FluoraOperation and values are descriptions
 */
export const OperationDescriptionSchema = z.record(
  FluoraOperationSchema,
  z.string()
);

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
            "type": "object",
            "additionalProperties": {}
          },
          "signedTransaction": {
            "type": "string"
          },
          "paymentMethod": {
            "type": "string",
            "enum": [
              "USDC_BASE_SEPOLIA",
              "USDC_BASE_MAINNET"
            ]
          }
        },
        "required": [
          "itemId",
          "params",
          "signedTransaction",
          "paymentMethod"
        ],
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

/**
 * Precheck success result schema
 */
export const precheckSuccessSchema = z.object({
  operationValid: z.boolean(),
  serverAccessible: z.boolean().optional(),
  estimatedCost: z.string().optional(),
  paymentMethodValid: z.boolean().optional(),
  walletAddressValid: z.boolean().optional(),
});

/**
 * Precheck failure result schema
 */
export const precheckFailSchema = z.object({
  error: z.string(),
  operationType: z.string().optional(),
});

/**
 * Execute success result schema
 */
export const executeSuccessSchema = z.object({
  operation: z.nativeEnum(FluoraOperation),
  result: z.any(),
  transactionHash: z.string().optional(),
  timestamp: z.number(),
  serverId: z.string().optional(),
  cost: z.string().optional(),
});

/**
 * Execute failure result schema
 */
export const executeFailSchema = z.object({
  error: z.string(),
  operation: z.nativeEnum(FluoraOperation),
  timestamp: z.number(),
});

// Type exports
export type ToolParams = z.infer<typeof toolParamsSchema>;
export type PrecheckSuccess = z.infer<typeof precheckSuccessSchema>;
export type PrecheckFail = z.infer<typeof precheckFailSchema>;
export type ExecuteSuccess = z.infer<typeof executeSuccessSchema>;
export type ExecuteFail = z.infer<typeof executeFailSchema>;
export type OperationDescriptions = z.infer<typeof OperationDescriptionSchema>;
