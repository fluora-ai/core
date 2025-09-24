import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  McpGatewayService,
  FluoraMcpClient,
} from '../../src/services/mcp-gateway.service';
import { FluoraMcpClientSSE } from '../../src/clients/fluora-mcp-client-sse';
import { FluoraMcpClientStreamable } from '../../src/clients/fluora-mcp-client-streamable';

// Mock the client implementations
vi.mock('../../src/clients/fluora-mcp-client-sse');
vi.mock('../../src/clients/fluora-mcp-client-streamable');

describe('McpGatewayService', () => {
  let service: McpGatewayService;
  const mockServerUrl = 'https://mock-server.com';

  // Create mock implementations
  const mockSseClient = ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    callTool: vi.fn(),
    listTools: vi.fn(),
  } as unknown) as FluoraMcpClientSSE;

  const mockStreamableClient = ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    callTool: vi.fn(),
    listTools: vi.fn(),
  } as unknown) as FluoraMcpClientStreamable;

  beforeEach(() => {
    service = new McpGatewayService();
    vi.resetAllMocks();

    // Set up the default mock implementations
    vi.mocked(FluoraMcpClientSSE).mockImplementation(() => mockSseClient);
    vi.mocked(FluoraMcpClientStreamable).mockImplementation(
      () => mockStreamableClient
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getConnection', () => {
    it('should try SSE client first', async () => {
      mockSseClient.connect.mockResolvedValue(undefined);

      const result = await service.getConnection(mockServerUrl);

      expect(FluoraMcpClientSSE).toHaveBeenCalled();
      expect(mockSseClient.connect).toHaveBeenCalledWith(mockServerUrl);
      expect(FluoraMcpClientStreamable).not.toHaveBeenCalled();
      expect(result).toBe(mockSseClient);
    });

    it('should fallback to Streamable client if SSE fails', async () => {
      // Make SSE client fail
      mockSseClient.connect.mockRejectedValue(
        new Error('SSE connection failed')
      );
      mockStreamableClient.connect.mockResolvedValue(undefined);

      const result = await service.getConnection(mockServerUrl);

      expect(FluoraMcpClientSSE).toHaveBeenCalled();
      expect(mockSseClient.connect).toHaveBeenCalledWith(mockServerUrl);
      expect(FluoraMcpClientStreamable).toHaveBeenCalled();
      expect(mockStreamableClient.connect).toHaveBeenCalledWith(mockServerUrl);
      expect(result).toBe(mockStreamableClient);
    });

    it('should reuse existing connections', async () => {
      // First connection
      mockSseClient.connect.mockResolvedValue(undefined);
      await service.getConnection(mockServerUrl);

      // Reset mocks to verify they aren't called again
      vi.clearAllMocks();

      // Second connection to same URL
      const result = await service.getConnection(mockServerUrl);

      expect(FluoraMcpClientSSE).not.toHaveBeenCalled();
      expect(mockSseClient.connect).not.toHaveBeenCalled();
      expect(FluoraMcpClientStreamable).not.toHaveBeenCalled();
      expect(result).toBe(mockSseClient);
    });
  });

  describe('callServerTool', () => {
    it('should get a connection and call the tool', async () => {
      const toolName = 'testTool';
      const args = { param1: 'value1' };
      const expectedResult = { success: true, data: 'result' };

      mockSseClient.connect.mockResolvedValue(undefined);
      mockSseClient.callTool.mockResolvedValue(expectedResult);

      const result = await service.callServerTool(
        mockServerUrl,
        toolName,
        args
      );

      expect(mockSseClient.connect).toHaveBeenCalledWith(mockServerUrl);
      expect(mockSseClient.callTool).toHaveBeenCalledWith(toolName, args);
      expect(result).toBe(expectedResult);
    });
  });

  describe('listServerTools', () => {
    it('should get a connection and list tools', async () => {
      const expectedTools = ['tool1', 'tool2'];

      mockSseClient.connect.mockResolvedValue(undefined);
      mockSseClient.listTools.mockResolvedValue(expectedTools);

      const result = await service.listServerTools(mockServerUrl);

      expect(mockSseClient.connect).toHaveBeenCalledWith(mockServerUrl);
      expect(mockSseClient.listTools).toHaveBeenCalled();
      expect(result).toBe(expectedTools);
    });
  });

  describe('closeAllConnections', () => {
    it('should close all connections', async () => {
      // Create multiple connections
      mockSseClient.connect.mockResolvedValue(undefined);
      await service.getConnection(mockServerUrl);

      mockStreamableClient.connect.mockResolvedValue(undefined);
      await service.getConnection('https://another-server.com');

      // Set up the connections map manually to ensure our mocks are used
      (service as any).connections.set(mockServerUrl, mockSseClient);
      (service as any).connections.set(
        'https://another-server.com',
        mockStreamableClient
      );

      await service.closeAllConnections();

      expect(mockSseClient.disconnect).toHaveBeenCalled();
      expect(mockStreamableClient.disconnect).toHaveBeenCalled();
    });

    it('should clear the connections map', async () => {
      // Create a connection
      mockSseClient.connect.mockResolvedValue(undefined);
      await service.getConnection(mockServerUrl);

      await service.closeAllConnections();

      // Try to get the same connection again - should create a new one
      vi.clearAllMocks();
      mockSseClient.connect.mockResolvedValue(undefined);
      await service.getConnection(mockServerUrl);

      // Verify connect was called again, meaning the cache was cleared
      expect(mockSseClient.connect).toHaveBeenCalled();
    });
  });

  describe('closeConnection', () => {
    it('should close a specific connection', async () => {
      // Create two connections
      mockSseClient.connect.mockResolvedValue(undefined);
      await service.getConnection(mockServerUrl);

      mockStreamableClient.connect.mockResolvedValue(undefined);
      const anotherServerUrl = 'https://another-server.com';
      await service.getConnection(anotherServerUrl);

      await service.closeConnection(mockServerUrl);

      expect(mockSseClient.disconnect).toHaveBeenCalled();
      expect(mockStreamableClient.disconnect).not.toHaveBeenCalled();

      // The connection should be removed from the cache
      vi.clearAllMocks();
      mockSseClient.connect.mockResolvedValue(undefined);
      await service.getConnection(mockServerUrl);
      expect(mockSseClient.connect).toHaveBeenCalled();

      // But the other connection should still be cached
      vi.clearAllMocks();
      await service.getConnection(anotherServerUrl);
      expect(mockStreamableClient.connect).not.toHaveBeenCalled();
    });

    it('should do nothing if connection does not exist', async () => {
      await service.closeConnection('nonexistent-url');
      // Should not throw and not call any client disconnect
      expect(mockSseClient.disconnect).not.toHaveBeenCalled();
      expect(mockStreamableClient.disconnect).not.toHaveBeenCalled();
    });
  });
});
