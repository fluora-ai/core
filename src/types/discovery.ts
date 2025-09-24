import { McpServer } from './registry.js';

export interface DiscoveryRequest {
  name?: string;
  category?: string;
  serverId?: string;
}

export interface DiscoveryResult {
  success: boolean;
  data?: McpServer[] | McpServer;
  error?: string;
  count?: number;
}
