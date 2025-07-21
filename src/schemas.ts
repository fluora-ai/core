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
