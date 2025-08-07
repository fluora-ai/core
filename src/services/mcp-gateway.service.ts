import { FluoraMcpClientSSE } from './fluora-mcp-client-sse.js';
import { FluoraMcpClientStreamable } from './fluora-mcp-client-streamable.js';

export interface FluoraMcpClient {
  connect(mcpServerUrl: string): Promise<void>;
  disconnect(): Promise<void>;
  callTool(toolName: string, toolParams?: Record<string, unknown>): Promise<unknown>;
  listTools(): Promise<unknown>;
}

/**
 * Service for managing connections and interactions with MonetizedMCPServers
 * This is the core gateway that maintains compatibility with existing tools
 */
export class McpGatewayService {
  private connections: Map<string, FluoraMcpClient> = new Map();

  /**
   * Get or create a connection to an MCP server
   * Tries SSE first, falls back to Streamable (same logic as fluora-mcp)
   */
  async getConnection(mcpServerUrl: string): Promise<FluoraMcpClient> {
    const existing = this.connections.get(mcpServerUrl);
    if (existing) {
      return existing;
    }

    let client: FluoraMcpClient;

    try {
      // Try SSE client first (preferred)
      client = new FluoraMcpClientSSE();
      await client.connect(mcpServerUrl);
    } catch {
      // Fallback to Streamable client
      client = new FluoraMcpClientStreamable();
      await client.connect(mcpServerUrl);
    }

    this.connections.set(mcpServerUrl, client);
    return client;
  }

  /**
   * Execute a tool on a MonetizedMCPServer
   */
  async callServerTool(
    mcpServerUrl: string,
    toolName: string,
    args: Record<string, unknown>
  ): Promise<unknown> {
    const client = await this.getConnection(mcpServerUrl);
    return await client.callTool(toolName, args);
  }

  /**
   * List available tools on a MonetizedMCPServer
   */
  async listServerTools(mcpServerUrl: string): Promise<unknown> {
    const client = await this.getConnection(mcpServerUrl);
    return await client.listTools();
  }

  /**
   * Close all connections
   */
  async closeAllConnections(): Promise<void> {
    const disconnectPromises = Array.from(
      this.connections.values()
    ).map(client => client.disconnect());
    await Promise.all(disconnectPromises);
    this.connections.clear();
  }

  /**
   * Close specific connection
   */
  async closeConnection(mcpServerUrl: string): Promise<void> {
    const client = this.connections.get(mcpServerUrl);
    if (client) {
      await client.disconnect();
      this.connections.delete(mcpServerUrl);
    }
  }
}
