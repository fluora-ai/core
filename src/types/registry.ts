import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

export interface MCPServerTool {
  name: string;
  description: string;
  schema: z.ZodRawShape;
  execute: (...args: unknown[]) => Promise<CallToolResult>;
}

export interface McpServer {
  id: string;
  name: string;
  description: string;
  website?: string;
  verified: boolean;
  walletAddress?: string;
  mcpServerUrl: string;
  categories?: string;
}

export interface McpServersFilter {
  name?: string;
  category?: string;
}

export interface ServicePrice {
  amount: number;
  currency?: string;
  paymentMethod: string;
}

export interface ServiceParams {
  [key: string]: unknown;
}

export interface ServerInfo {
  mcpServerUrl: string;
  serverId: string;
  serverName: string;
  verified: boolean;
  categories: string;
}

export interface PaymentInfo {
  walletAddress: string;
  paymentMethod: string;
}

export interface RawServiceItem {
  id: string;
  name: string;
  description?: string;
  price: ServicePrice;
  params: ServiceParams;
}

export interface EnrichedService extends RawServiceItem {
  serverInfo: ServerInfo;
  paymentInfo: PaymentInfo;
  executionReady: boolean;
  category: string;
}

export interface ServiceRegistry {
  totalServersExplored: number;
  totalServicesFound: number;
  category?: string;
  services: EnrichedService[];
  metadata: {
    exploredAt: string;
    errors: Array<{
      serverName: string;
      error: string;
    }>;
  };
}

export interface PriceListingResponse {
  items: RawServiceItem[];
}

export interface PaymentMethodsResponse {
  walletAddress: string;
  paymentMethod: string;
}

export interface ServiceStatistics {
  totalServices: number;
  executionReadyServices: number;
  categoriesCount: number;
  serversWithErrors: number;
  averageServicesPerServer: number;
}
