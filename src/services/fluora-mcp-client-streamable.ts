import { FluoraMcpClient } from './mcp-gateway.service.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

export class FluoraMcpClientStreamable implements FluoraMcpClient {
  private client: Client | null;
  private transport: StreamableHTTPClientTransport | null;

  constructor() {
    this.client = null;
    this.transport = null;
  }

  async connect(mcpServerUrl: string): Promise<void> {
    // Implementation mirrors fluora-mcp client-streamable.ts
    this.client = new Client(
      {
        name: 'fluora-streamable-client',
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

    this.transport = new StreamableHTTPClientTransport(
      new URL(mcpServerUrl + '/mcp')
    );

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
    await this.client.connect(this.transport);
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
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
