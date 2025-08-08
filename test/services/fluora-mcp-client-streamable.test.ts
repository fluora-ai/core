import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FluoraMcpClientStreamable } from '@/services/fluora-mcp-client-streamable';

// Mock the MCP SDK modules
vi.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: vi.fn().mockImplementation(() => ({
    connect: vi.fn(),
    close: vi.fn(),
    callTool: vi.fn(),
    listTools: vi.fn(),
  })),
}));

vi.mock('@modelcontextprotocol/sdk/client/streamableHttp.js', () => ({
  StreamableHTTPClientTransport: vi.fn().mockImplementation(() => ({})),
}));

describe('FluoraMcpClientStreamable', () => {
  let client: FluoraMcpClientStreamable;
  let mockClient: any;

  beforeEach(() => {
    client = new FluoraMcpClientStreamable();
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
    it('should store server URL and verify connectivity', async () => {
      const serverUrl = 'https://test-server.com';

      // Mock the dynamic imports
      const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
      const { StreamableHTTPClientTransport } = await import('@modelcontextprotocol/sdk/client/streamableHttp.js');

      vi.mocked(Client).mockReturnValue(mockClient);

      await client.connect(serverUrl);

      expect(Client).toHaveBeenCalledWith(
        { name: 'fluora-streamable-client', version: '1.0.0' },
        { capabilities: { prompts: {}, resources: {}, tools: {} } }
      );
      expect(StreamableHTTPClientTransport).toHaveBeenCalledWith(new URL(`${serverUrl}/mcp`));
      expect(mockClient.connect).toHaveBeenCalled();
    });

    it('should throw error if server is not reachable', async () => {
      const serverUrl = 'https://unreachable-server.com';

      // Mock the dynamic imports
      const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
      const { StreamableHTTPClientTransport } = await import('@modelcontextprotocol/sdk/client/streamableHttp.js');

      vi.mocked(Client).mockReturnValue(mockClient);
      mockClient.connect.mockRejectedValue(new Error('fetch failed'));

      await expect(client.connect(serverUrl)).rejects.toThrow('fetch failed');
    });
  });

  describe('disconnect', () => {
    it('should reset the server URL', async () => {
      // Set up the client first
      (client as any).client = mockClient;

      await client.disconnect();

      expect(mockClient.close).toHaveBeenCalled();
    });
  });

  describe('callTool', () => {
    it('should call tool endpoint with correct parameters', async () => {
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

    it('should throw error if server URL is not set', async () => {
      // Don't set up the client (simulate not connected)
      await expect(client.callTool('test-tool')).rejects.toThrow('Client not connected');
    });

    it('should handle API errors', async () => {
      // Set up the client but make it throw an error
      (client as any).client = mockClient;
      mockClient.callTool.mockRejectedValue(new Error('API error'));

      await expect(client.callTool('test-tool')).rejects.toThrow('API error');
    });
  });

  describe('listTools', () => {
    it('should fetch available tools from the server', async () => {
      const mockTools = { tools: [{ name: 'tool1' }, { name: 'tool2' }] };
      mockClient.listTools.mockResolvedValue(mockTools);

      // Set up the client
      (client as any).client = mockClient;

      const result = await client.listTools();

      expect(mockClient.listTools).toHaveBeenCalled();
      expect(result).toEqual(mockTools);
    });

    it('should throw error if server URL is not set', async () => {
      // Don't set up the client (simulate not connected)
      await expect(client.listTools()).rejects.toThrow('Client not connected');
    });

    it('should handle API errors', async () => {
      // Set up the client but make it throw an error
      (client as any).client = mockClient;
      mockClient.listTools.mockRejectedValue(new Error('API error'));

      await expect(client.listTools()).rejects.toThrow('API error');
    });
  });
});
