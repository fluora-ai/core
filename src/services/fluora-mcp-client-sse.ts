import { FluoraMcpClient } from './mcp-gateway.service.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

export class FluoraMcpClientSSE implements FluoraMcpClient {
  private client: Client | null;
  private transport: SSEClientTransport | null;

  constructor() {
    this.client = null;
    this.transport = null;
  }

  async connect(mcpServerUrl: string): Promise<void> {
    // Implementation mirrors fluora-mcp client-sse.ts
    this.client = new Client(
      {
        name: 'fluora-client',
        version: '1.0.0',
      },
      {
        capabilities: {
          prompts: {},
          resources: {},
          tools: {},
        },
      }
    );

    this.transport = new SSEClientTransport(new URL(mcpServerUrl + '/sse'));
    await this.client.connect(this.transport);
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
    }
  }

  async callTool(
    toolName: string,
    toolParams?: Record<string, unknown>
  ): Promise<unknown> {
    if (!this.client) {
      throw new Error('Client not connected');
    }

    const result = await this.client.callTool({
      name: toolName,
      arguments: toolParams,
    });
    return result as unknown;
  }

  async listTools(): Promise<unknown> {
    if (!this.client) {
      throw new Error('Client not connected');
    }

    const result = await this.client.listTools();
    return result as unknown;
  }
}
