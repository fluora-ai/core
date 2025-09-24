import { BlockchainPaymentService } from './blockchain-payment.service.js';
import { McpGatewayService } from './mcp-gateway.service.js';
import {
  EnrichedService,
  ServiceExecutionRequest,
  ServiceExecutionResult,
} from '../types/registry.js';
import { PaymentMethods } from '../types/operations.js';
import { FluoraMcpClient } from '../clients/fluora.mcp-client.js';

export class ServiceExecutionService {
  private readonly paymentService: BlockchainPaymentService;
  private readonly gateway: McpGatewayService;

  constructor() {
    this.paymentService = new BlockchainPaymentService();
    this.gateway = new McpGatewayService();
  }

  async executeService(
    request: ServiceExecutionRequest,
    service: EnrichedService
  ): Promise<ServiceExecutionResult> {
    const startTime = Date.now();
    let client: FluoraMcpClient | null = null;

    try {
      // 1) Validate service readiness and params
      this.validateServiceExecution(service);

      // 2) Connect to server
      client = await this.gateway.getConnection(request.serverUrl);

      // 3) Verify service still exists
      await this.verifyServiceAvailability(client, request.serviceId);

      // 4) Sign payment transaction via core payment service
      const signedPayment = await this.paymentService.signPaymentTransaction(
        service.price.amount,
        service.paymentInfo.walletAddress,
        this.toPaymentMethodEnum(service.price.paymentMethod),
        request.pkpPrivateKey
      );

      // 5) Execute make-purchase on the server
      const purchaseResult = await this.executePurchase(
        client,
        request.serviceId,
        request.params,
        service.price.paymentMethod,
        signedPayment.signedTransaction
      );

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        result: purchaseResult,
        transactionCost: `${service.price.amount} ${service.price.currency ||
          'USDC'}`,
        executionTime,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message, executionTime };
    } finally {
      if (client) {
        await client.disconnect();
      }
    }
  }

  private validateServiceExecution(service: EnrichedService): void {
    if (!service.executionReady) {
      throw new Error(
        `Service ${service.id} is not ready for execution. Missing payment information.`
      );
    }
    if (!service.paymentInfo.walletAddress) {
      throw new Error(
        `Service ${service.id} is missing wallet address for payment method ${service.paymentInfo.paymentMethod}`
      );
    }
    if (!service.serverInfo.mcpServerUrl) {
      throw new Error(`Service ${service.id} is missing server URL`);
    }
    if (service.price.amount < 0) {
      throw new Error(
        `Service ${service.id} has invalid price: ${service.price.amount}`
      );
    }
  }

  private async verifyServiceAvailability(
    client: FluoraMcpClient,
    serviceId: string
  ): Promise<void> {
    const result = await client.callTool('price-listing', { searchQuery: '' });
    const parsed = this.parseToolResult(result);
    const items =
      parsed && typeof parsed === 'object' && 'items' in parsed
        ? (parsed as { items?: Array<{ id: string }> }).items
        : undefined;
    const exists = Array.isArray(items) && items.some(i => i.id === serviceId);
    if (!exists) {
      throw new Error(
        `Service ${serviceId} is no longer available on the server`
      );
    }
  }

  private async executePurchase(
    client: FluoraMcpClient,
    itemId: string,
    params: Record<string, unknown>,
    paymentMethod: string,
    signedTransaction: string
  ): Promise<unknown> {
    const args = { itemId, params, paymentMethod, signedTransaction };
    const result = await client.callTool('make-purchase', args);
    const parsed = this.parseToolResult(result);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'toolResult' in parsed &&
      (parsed as { toolResult?: unknown }).toolResult === 'Payment failed'
    ) {
      throw new Error('Payment verification failed on server');
    }
    return parsed;
  }

  private parseToolResult(result: unknown): unknown {
    if (typeof result === 'object' && result !== null && 'content' in result) {
      const content = (result as { content?: Array<{ text?: string }> })
        .content;
      const text = Array.isArray(content) && content[0]?.text;
      if (typeof text === 'string') {
        try {
          return JSON.parse(text);
        } catch {
          return text;
        }
      }
    }
    if (typeof result === 'string') {
      try {
        return JSON.parse(result);
      } catch {
        return result;
      }
    }
    return result;
  }

  private toPaymentMethodEnum(value: string): PaymentMethods {
    if (Object.prototype.hasOwnProperty.call(PaymentMethods, value)) {
      return ((PaymentMethods as unknown) as Record<string, PaymentMethods>)[
        value
      ];
    }
    // Fallback to known values by comparison
    const candidates = Object.values(PaymentMethods) as string[];
    const match = candidates.find(v => v === value);
    if (match) return (match as unknown) as PaymentMethods;
    throw new Error(`Unsupported payment method: ${value}`);
  }
}
