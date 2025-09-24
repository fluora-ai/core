import { FluoraOperation, PaymentMethods } from '../types/operations.js';
import {
  McpGatewayService,
  BlockchainPaymentService,
  ServiceRegistryService,
  ServiceExecutionService,
} from '../services/index.js';
import {
  ServiceExecutionRequest,
  ServiceExecutionResult,
  EnrichedService,
  RawServiceItem,
} from '../types/registry.js';

export interface ExecutionRequest {
  operation: FluoraOperation;
  serverId: string;
  mcpServerUrl: string;
  toolName?: string;
  args?: Record<string, unknown>;
  itemPrice?: string;
  serverWalletAddress?: string;
  paymentMethod?: PaymentMethods;
  pkpPrivateKey?: string;
}

// Create a type for the execution result with a union for the different tools results
export interface ExecutionResult {
  success: boolean;
  data?: unknown;
  error?: string;
  transactionHash?: string;
  cost?: string;
}

/**
 * ExecutionController - Core gateway to all MonetizedMCPServers
 * Handles tool execution, payments, and monetization operations
 */
export class ExecutionController {
  private readonly mcpGateway: McpGatewayService;
  private readonly paymentService: BlockchainPaymentService;
  private readonly serviceRegistryService: ServiceRegistryService;
  private readonly serviceExecutionService: ServiceExecutionService;

  constructor() {
    this.mcpGateway = new McpGatewayService();
    this.paymentService = new BlockchainPaymentService();
    this.serviceRegistryService = new ServiceRegistryService();
    this.serviceExecutionService = new ServiceExecutionService();
  }

  /**
   * Execute price-listing operation on a MonetizedMCPServer
   */
  async handlePriceListing(
    request: ExecutionRequest
  ): Promise<ExecutionResult> {
    try {
      console.warn(
        '[execution-controller] Getting price listing for:',
        request.serverId
      );

      const result = await this.mcpGateway.callServerTool(
        request.mcpServerUrl,
        FluoraOperation.PRICE_LISTING,
        {}
      );

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get price listing: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Execute payment-methods operation on a MonetizedMCPServer
   */
  async handlePaymentMethods(
    request: ExecutionRequest
  ): Promise<ExecutionResult> {
    try {
      console.warn(
        '[execution-controller] Getting payment methods for:',
        request.serverId
      );

      const result = await this.mcpGateway.callServerTool(
        request.mcpServerUrl,
        FluoraOperation.PAYMENT_METHODS,
        {}
      );

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get payment methods: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Execute make-purchase operation with blockchain payment via lit-protocol
   * This is the core integration point that replaces MCP payments with Vincent payments
   */
  async handleMakePurchase(
    request: ExecutionRequest
  ): Promise<ExecutionResult> {
    try {
      console.warn(
        '[execution-controller] Processing purchase for:',
        request.serverId
      );

      // Validate required parameters
      if (
        !request.itemPrice ||
        !request.serverWalletAddress ||
        !request.paymentMethod
      ) {
        return {
          success: false,
          error:
            'itemPrice, serverWalletAddress, and paymentMethod are required for make-purchase',
        };
      }

      // Sign payment transaction using lit-protocol (replaces PaymentsTools.signTransaction)
      const signedPayment = await this.paymentService.signPaymentTransaction(
        parseFloat(request.itemPrice),
        request.serverWalletAddress,
        request.paymentMethod,
        request.pkpPrivateKey
      );

      // Prepare arguments for the MonetizedMCPServer make-purchase tool
      const purchaseArgs = {
        ...request.args,
        itemPrice: request.itemPrice,
        serverWalletAddress: request.serverWalletAddress,
        paymentMethod: request.paymentMethod,
        signedTransaction: signedPayment.signedTransaction,
      };

      // Execute the purchase on the MonetizedMCPServer
      const result = await this.mcpGateway.callServerTool(
        request.mcpServerUrl,
        FluoraOperation.MAKE_PURCHASE,
        purchaseArgs
      );

      return {
        success: true,
        data: result,
        transactionHash: signedPayment.signedTransaction,
        cost: request.itemPrice,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to process purchase: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Execute any tool on a MonetizedMCPServer
   */
  async handleCallServerTool(
    request: ExecutionRequest
  ): Promise<ExecutionResult> {
    try {
      console.warn(
        '[execution-controller] Calling tool:',
        request.toolName,
        'on server:',
        request.serverId
      );

      if (!request.toolName) {
        return {
          success: false,
          error: 'toolName is required for callServerTool operation',
        };
      }

      // Execute regular tool
      const result = await this.mcpGateway.callServerTool(
        request.mcpServerUrl,
        request.toolName,
        request.args || {}
      );

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to call server tool: ${(error as Error).message}`,
      };
    }
  }

  /**
   * List available tools on a MonetizedMCPServer
   */
  async handleListTools(request: ExecutionRequest): Promise<ExecutionResult> {
    try {
      console.warn(
        '[execution-controller] Listing tools for server:',
        request.serverId
      );

      const result = await this.mcpGateway.listServerTools(
        request.mcpServerUrl
      );

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to list server tools: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Execute a service using the ServiceExecutionService
   */
  async handleServiceExecution(
    request: ServiceExecutionRequest,
    service: EnrichedService
  ): Promise<ServiceExecutionResult> {
    return await this.serviceExecutionService.executeService(request, service);
  }

  /**
   * Get execution cost estimate for a service
   */
  getExecutionCostEstimate(
    service: EnrichedService
  ): {
    amount: number;
    currency: string;
    paymentMethod: string;
    walletAddress: string;
  } {
    return {
      amount: service.price.amount,
      currency: service.price.currency || 'USDC',
      paymentMethod: service.price.paymentMethod,
      walletAddress: service.paymentInfo.walletAddress,
    };
  }

  /**
   * Validate service execution readiness
   */
  validateServiceExecution(service: EnrichedService): void {
    return this.serviceRegistryService.validateServiceExecution(service);
  }

  /**
   * Validate service parameters
   */
  validateServiceParams(
    service: RawServiceItem,
    params: Record<string, unknown>
  ): void {
    return this.serviceRegistryService.validateServiceParams(service, params);
  }

  /**
   * Validate server accessibility before execution
   */
  async validateServerAccess(mcpServerUrl: string): Promise<boolean> {
    try {
      await this.mcpGateway.getConnection(mcpServerUrl);
      return true;
    } catch (error) {
      console.warn(
        '[execution-controller] Server validation failed:',
        (error as Error).message
      );
      return false;
    }
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    await this.mcpGateway.closeAllConnections();
  }
}
