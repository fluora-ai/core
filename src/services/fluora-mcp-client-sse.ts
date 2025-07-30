import { FluoraMcpClient } from './mcp-gateway.service';

export class FluoraMcpClientSSE implements FluoraMcpClient {
  private client: unknown;
  private transport: unknown;

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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
    await (this.client as any).connect(this.transport);
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
      await (this.client as any).close();
    }
  }

  async callTool(
    toolName: string,
    toolParams?: Record<string, unknown>
  ): Promise<unknown> {
    if (!this.client) {
      throw new Error('Client not connected');
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
    const result = await (this.client as any).callTool({
      name: toolName,
      arguments: toolParams,
    });
    return result as unknown;
  }

  async listTools(): Promise<unknown> {
    if (!this.client) {
      throw new Error('Client not connected');
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
    const result = await (this.client as any).listTools();
    return result as unknown;
  }
}
