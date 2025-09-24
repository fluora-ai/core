import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FluoraMcpClientSSE } from '../../src/clients/fluora-mcp-client-sse';

// Mock the MCP SDK modules
vi.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: vi.fn().mockImplementation(() => ({
    connect: vi.fn(),
    close: vi.fn(),
    callTool: vi.fn(),
    listTools: vi.fn(),
  })),
}));

vi.mock('@modelcontextprotocol/sdk/client/sse.js', () => ({
  SSEClientTransport: vi.fn().mockImplementation(() => ({})),
}));

describe('FluoraMcpClientSSE', () => {
  let client: FluoraMcpClientSSE;
  let mockClient: any;

  beforeEach(() => {
    client = new FluoraMcpClientSSE();
    mockClient = {
      connect: vi.fn(),
      close: vi.fn(),
      callTool: vi.fn(),
      listTools: vi.fn(),
    };

    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('connect', () => {
    it('should create event source and set up event listeners', async () => {
      const serverUrl = 'https://test-server.com';

      // Mock the dynamic imports
      const { Client } = await import(
        '@modelcontextprotocol/sdk/client/index.js'
      );
      const { SSEClientTransport } = await import(
        '@modelcontextprotocol/sdk/client/sse.js'
      );

      vi.mocked(Client).mockReturnValue(mockClient);

      await client.connect(serverUrl);

      expect(Client).toHaveBeenCalledWith(
        { name: 'fluora-client', version: '1.0.0' },
        { capabilities: { prompts: {}, resources: {}, tools: {} } }
      );
      expect(SSEClientTransport).toHaveBeenCalledWith(
        new URL(`${serverUrl}/sse`)
      );
      expect(mockClient.connect).toHaveBeenCalled();
    });
  });

  describe('disconnect', () => {
    it('should close event source and clean up listeners', async () => {
      // Set up the client first
      (client as any).client = mockClient;

      await client.disconnect();

      expect(mockClient.close).toHaveBeenCalled();
    });
  });

  describe('callTool', () => {
    it('should send tool call request and return response', async () => {
      const mockResult = { content: [{ type: 'text', text: 'tool-result' }] };
      mockClient.callTool.mockResolvedValue(mockResult);

      // Set up the client
      (client as any).client = mockClient;

      const result = await client.callTool('test-tool', { param: 'value' });

      expect(mockClient.callTool).toHaveBeenCalledWith({
        name: 'test-tool',
        arguments: { param: 'value' },
      });
      expect(result).toEqual(mockResult);
    });

    it('should throw error if client is not connected', async () => {
      // Don't set up the client (simulate not connected)
      await expect(client.callTool('test-tool')).rejects.toThrow(
        'Client not connected'
      );
    });
  });

  describe('listTools', () => {
    it('should return available tools', async () => {
      const mockTools = { tools: [{ name: 'tool1' }, { name: 'tool2' }] };
      mockClient.listTools.mockResolvedValue(mockTools);

      // Set up the client
      (client as any).client = mockClient;

      const result = await client.listTools();

      expect(mockClient.listTools).toHaveBeenCalled();
      expect(result).toEqual(mockTools);
    });

    it('should throw error if client is not connected', async () => {
      // Don't set up the client (simulate not connected)
      await expect(client.listTools()).rejects.toThrow('Client not connected');
    });
  });
});
