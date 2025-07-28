import { FluoraMcpClient } from './mcp-gateway.service';

export class FluoraMcpClientSSE implements FluoraMcpClient {
  private client: any;
  private transport: any;

  constructor() {
    this.client = null;
    this.transport = null;
  }

  async connect(mcpServerUrl: string): Promise<void> {
    // Implementation mirrors fluora-mcp client-sse.ts
    const { Client } = await import(
      '@modelcontextprotocol/sdk/client/index.js'
    );
    const { SSEClientTransport } = await import(
      '@modelcontextprotocol/sdk/client/sse.js'
    );

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

  async callTool(toolName: string, toolParams?: any): Promise<any> {
    if (!this.client) {
      throw new Error('Client not connected');
    }

    const result = await this.client.callTool({
      name: toolName,
      arguments: toolParams,
    });
    return result;
  }

  async listTools(): Promise<any> {
    if (!this.client) {
      throw new Error('Client not connected');
    }

    const result = await this.client.listTools();
    return result;
  }
}
