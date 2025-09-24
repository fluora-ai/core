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
