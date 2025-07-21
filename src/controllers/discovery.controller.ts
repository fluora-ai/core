import { FluoraApiService, McpServer, McpServersFilter } from '../services';

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

/**
 * DiscoveryController - Handles server discovery and metadata operations
 * Replaces searchFluora, listServers, and getServerInfo from fluora-mcp
 */
export class DiscoveryController {
  private apiService: FluoraApiService;

  constructor() {
    this.apiService = new FluoraApiService();
  }

  /**
   * Search for Fluora servers by name
   * Replaces the searchFluora tool from fluora-mcp
   */
  async handleSearchFluora(request: DiscoveryRequest): Promise<DiscoveryResult> {
    try {
      console.log('[discovery-controller] Searching Fluora servers with filter:', request);

      const filter: McpServersFilter = {
        name: request.name
      };

      const servers = await this.apiService.searchServers(filter);

      return {
        success: true,
        data: servers,
        count: servers.length
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to search Fluora servers: ${error.message}`
      };
    }
  }

  /**
   * List all available servers with optional filtering
   * Replaces the listServers functionality
   */
  async handleListServers(request: DiscoveryRequest): Promise<DiscoveryResult> {
    try {
      console.log('[discovery-controller] Listing servers with filter:', request);

      const filter: McpServersFilter = {
        name: request.name,
        category: request.category
      };

      const servers = await this.apiService.listServers(filter);

      return {
        success: true,
        data: servers,
        count: servers.length
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to list servers: ${error.message}`
      };
    }
  }

  /**
   * Get detailed information about a specific server
   */
  async handleGetServerInfo(request: DiscoveryRequest): Promise<DiscoveryResult> {
    try {
      if (!request.serverId) {
        return {
          success: false,
          error: 'serverId is required for getServerInfo operation'
        };
      }

      console.log('[discovery-controller] Getting server info for:', request.serverId);

      const server = await this.apiService.getServerInfo(request.serverId);

      if (!server) {
        return {
          success: false,
          error: `Server with ID ${request.serverId} not found`
        };
      }

      return {
        success: true,
        data: server
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get server info: ${error.message}`
      };
    }
  }

  /**
   * Validate that a server URL is accessible
   */
  async validateServerUrl(mcpServerUrl: string): Promise<boolean> {
    return this.apiService.validateServerUrl(mcpServerUrl);
  }
}
