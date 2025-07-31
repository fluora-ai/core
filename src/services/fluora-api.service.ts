import axios from 'axios';
import { Constants } from '@/utils/constants';

export interface McpServer {
  id: string;
  name: string;
  description: string;
  website: string;
  verified: boolean;
  walletAddress: string;
  mcpServerUrl: string;
  category?: string;
}

export interface McpServersFilter {
  name?: string;
  category?: string;
}

/**
 * Service for interacting with the Fluora API backend
 * Handles server discovery and metadata operations
 */
export class FluoraApiService {
  private readonly apiUrl: string;

  constructor() {
    this.apiUrl = Constants.API_BASE_URL;
  }

  /**
   * Search for Fluora servers by name or other criteria
   */
  async searchServers(filter: McpServersFilter): Promise<McpServer[]> {
    try {
      const response = await axios.get(`${this.apiUrl}/mcp-agents`, {
        params: {
          name: filter.name ?? '',
          category: filter.category ?? '',
        },
      });
      return response.data as McpServer[];
    } catch (error) {
      console.error('Error searching servers:', error);
      return [];
    }
  }

  /**
   * Get all available servers
   */
  async listServers(filter?: McpServersFilter): Promise<McpServer[]> {
    return this.searchServers(filter || {});
  }

  /**
   * Get specific server information by ID
   */
  async getServerInfo(serverId: string): Promise<McpServer | null> {
    try {
      const response = await axios.get(`${this.apiUrl}/mcp-agents/${serverId}`);
      return response.data as McpServer;
    } catch (error) {
      console.error('Error getting server info:', error);
      return null;
    }
  }

  /**
   * Validate if a server URL is accessible
   */
  async validateServerUrl(mcpServerUrl: string): Promise<boolean> {
    try {
      const response = await axios.get(`${mcpServerUrl}/health`, {
        timeout: 5000,
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }
}
