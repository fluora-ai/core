import { McpGatewayService } from './mcp-gateway.service.js';
import {
  EnrichedService,
  PaymentInfo,
  PaymentMethodsResponse,
  PriceListingResponse,
  RawServiceItem,
  ServerInfo,
  ServiceRegistry,
  ServiceStatistics,
} from '../types/registry.js';
import { FluoraMcpClient } from '../clients/fluora.mcp-client.js';
import { McpServer } from '../types/registry.js';

export class ServiceRegistryService {
  private readonly gateway: McpGatewayService;

  constructor() {
    this.gateway = new McpGatewayService();
  }

  async exploreAndEnrichServices(
    servers: Array<McpServer>,
    category?: string,
    maxServers: number = 20,
    isUnsafeDirectAccess = false
  ): Promise<ServiceRegistry> {
    let limitedServers = servers;
    const errors: ServiceRegistry['metadata']['errors'] = [];
    const enrichedServices: EnrichedService[] = [];
    let totalServicesFound = 0;

    // Filter by category if specified, but not for direct access
    if (category && !isUnsafeDirectAccess) {
      limitedServers = limitedServers.filter(
        server =>
          server.categories?.toLowerCase().includes(category.toLowerCase()) ||
          server.description?.toLowerCase().includes(category.toLowerCase())
      );
    }

    // Limit the number of servers, but not for direct access
    if (!isUnsafeDirectAccess) {
      limitedServers = limitedServers.slice(0, maxServers);
    }

    // Explore servers in parallel for better performance
    const serverPromises = limitedServers.map(
      async (
        server
      ): Promise<
        | {
            success: true;
            serverName: string;
            services: EnrichedService[];
          }
        | {
            success: false;
            serverName: string;
            error: string;
          }
      > => {
        try {
          const serverServices = await this.exploreServerServices(server);

          return {
            success: true,
            serverName: server.name,
            services: serverServices,
          };
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';

          return {
            success: false,
            serverName: server.name,
            error: errorMessage,
          };
        }
      }
    );

    const results = await Promise.allSettled(serverPromises);

    for (const result of results) {
      if (result.status === 'fulfilled') {
        const serverResult = result.value;
        if (serverResult.success) {
          enrichedServices.push(...serverResult.services);
          totalServicesFound += serverResult.services.length;
        } else {
          errors.push({
            serverName: serverResult.serverName,
            error: serverResult.error,
          });
        }
      } else {
        const reasonText = this.stringifyReason(result.reason);
        errors.push({
          serverName: 'Unknown server',
          error: reasonText,
        });
      }
    }

    // Return the results
    return {
      totalServersExplored: limitedServers.length,
      totalServicesFound: totalServicesFound,
      category,
      services: category
        ? enrichedServices.filter(s => s.category === category)
        : enrichedServices,
      metadata: {
        exploredAt: new Date().toISOString(),
        errors,
      },
    };
  }

  private async exploreServerServices(
    server: McpServer
  ): Promise<EnrichedService[]> {
    const client = await this.gateway.getConnection(server.mcpServerUrl);

    try {
      const pricingData = await this.getPricingData(client);
      const paymentMethods = await this.getPaymentMethods(client);

      const serverInfo: ServerInfo = {
        mcpServerUrl: server.mcpServerUrl,
        serverId: server.id,
        serverName: server.name,
        verified: server.verified || false,
        categories: server.categories || '',
      };

      const services: EnrichedService[] = pricingData.items.map(
        (rawService: RawServiceItem): EnrichedService => {
          const normalizedService = this.normalizeServiceData(rawService);
          let paymentInfo: PaymentInfo;

          try {
            paymentInfo = this.findMatchingPayment(
              normalizedService.price.paymentMethod,
              paymentMethods
            );
          } catch {
            paymentInfo = {
              walletAddress: '',
              paymentMethod: normalizedService.price.paymentMethod,
            };
          }

          return {
            ...normalizedService,
            serverInfo,
            paymentInfo,
            executionReady: Boolean(paymentInfo.walletAddress),
            category: this.extractPrimaryCategory(server.categories || ''),
          };
        }
      );

      return services;
    } finally {
      await client.disconnect();
    }
  }

  private async getPricingData(
    client: FluoraMcpClient
  ): Promise<PriceListingResponse> {
    const tools = ['pricing-listing', 'price-listing'];
    for (const toolName of tools) {
      try {
        const result = await client.callTool(toolName, { searchQuery: '' });
        const parsed = this.parseToolResult(result);
        if (this.isPriceListingResponse(parsed)) return parsed;
      } catch {
        continue;
      }
    }
    throw new Error('No compatible pricing tool found on server');
  }

  private async getPaymentMethods(
    client: FluoraMcpClient
  ): Promise<PaymentMethodsResponse[]> {
    const result = await client.callTool('payment-methods', {});
    const parsed = this.parseToolResult(result);
    if (!this.isPaymentMethodsResponseArray(parsed)) {
      throw new Error('Invalid payment methods response format');
    }
    return parsed;
  }

  private findMatchingPayment(
    paymentMethod: string,
    paymentMethods: PaymentMethodsResponse[]
  ): PaymentInfo {
    const match = paymentMethods.find(pm => pm.paymentMethod === paymentMethod);
    if (!match)
      throw new Error(`No wallet found for payment method: ${paymentMethod}`);
    return {
      walletAddress: match.walletAddress,
      paymentMethod: match.paymentMethod,
    };
  }

  private normalizeServiceData(rawService: RawServiceItem): RawServiceItem {
    return {
      id: rawService.id,
      name: rawService.name,
      description: rawService.description || 'No description available',
      price: {
        amount: rawService.price.amount,
        currency: rawService.price.currency,
        paymentMethod: rawService.price.paymentMethod,
      },
      params: rawService.params || {},
    };
  }

  private extractPrimaryCategory(categories: string): string {
    if (!categories) return 'uncategorized';
    return categories.split(',')[0].trim() || 'uncategorized';
  }

  findServiceById(
    services: EnrichedService[],
    serviceId: string
  ): EnrichedService | null {
    return services.find(s => s.id === serviceId) || null;
  }

  validateServiceExecution(service: EnrichedService): void {
    if (!service.executionReady) {
      throw new Error('Service is not execution-ready');
    }
    if (!service.paymentInfo.walletAddress) {
      throw new Error('Missing server wallet address');
    }
  }

  validateServiceParams(
    service: RawServiceItem,
    providedParams: Record<string, unknown>
  ): void {
    const requiredParams = Object.keys(service.params || {});
    const providedParamKeys = Object.keys(providedParams || {});
    for (const requiredParam of requiredParams) {
      if (!providedParamKeys.includes(requiredParam)) {
        throw new Error(`Missing required parameter: ${requiredParam}`);
      }
    }
    for (const providedParam of providedParamKeys) {
      if (!requiredParams.includes(providedParam)) {
        throw new Error(`Extra parameter provided: ${providedParam}`);
      }
    }
  }

  groupServicesByCategory(
    services: EnrichedService[]
  ): Record<string, EnrichedService[]> {
    return services.reduce<Record<string, EnrichedService[]>>((acc, svc) => {
      const key = svc.category || 'uncategorized';
      if (!acc[key]) acc[key] = [];
      acc[key].push(svc);
      return acc;
    }, {});
  }

  private parseToolResult(result: unknown): unknown {
    const text = this.extractTextFromResult(result);
    if (text) {
      const json = this.tryParseJson(text);
      if (json !== null) return json;
    }
    const asJson = this.tryParseJson(result);
    return asJson !== null ? asJson : result;
  }

  private stringifyReason(reason: unknown): string {
    if (reason instanceof Error) return reason.message;
    if (typeof reason === 'string') return reason;
    try {
      return JSON.stringify(reason);
    } catch {
      return 'Promise rejection';
    }
  }

  private extractTextFromResult(result: unknown): string | null {
    if (typeof result === 'object' && result !== null && 'content' in result) {
      const content = (result as { content?: unknown[] }).content;
      if (Array.isArray(content) && content.length > 0) {
        const first = content[0];
        if (
          typeof first === 'object' &&
          first !== null &&
          'text' in first &&
          typeof (first as { text?: unknown }).text === 'string'
        ) {
          return (first as { text: string }).text;
        }
      }
    }
    return null;
  }

  private tryParseJson(
    value: unknown
  ): Record<string, unknown> | unknown[] | null {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value) as unknown;
        if (Array.isArray(parsed)) return parsed as unknown[];
        if (typeof parsed === 'object' && parsed !== null)
          return parsed as Record<string, unknown>;
        return null;
      } catch {
        return null;
      }
    }
    return null;
  }

  private isPriceListingResponse(
    value: unknown
  ): value is PriceListingResponse {
    if (typeof value !== 'object' || value === null) return false;
    const maybe = value as { items?: unknown };
    return Array.isArray(maybe.items);
  }

  private isPaymentMethodsResponseArray(
    value: unknown
  ): value is PaymentMethodsResponse[] {
    if (!Array.isArray(value)) return false;
    return value.every(v => {
      if (typeof v !== 'object' || v === null) return false;
      const obj = v as { walletAddress?: unknown; paymentMethod?: unknown };
      return (
        typeof obj.walletAddress === 'string' &&
        typeof obj.paymentMethod === 'string'
      );
    });
  }
  getExecutionReadyServices(services: EnrichedService[]): EnrichedService[] {
    return services.filter(service => service.executionReady);
  }

  getServiceStatistics(registry: ServiceRegistry): ServiceStatistics {
    const executionReadyServices = this.getExecutionReadyServices(
      registry.services
    );
    const categories = new Set(registry.services.map(s => s.category));

    return {
      totalServices: registry.totalServicesFound,
      executionReadyServices: executionReadyServices.length,
      categoriesCount: categories.size,
      serversWithErrors: registry.metadata.errors.length,
      averageServicesPerServer:
        registry.totalServersExplored > 0
          ? Math.round(
              registry.totalServicesFound / registry.totalServersExplored
            )
          : 0,
    };
  }
}
