import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  DiscoveryController,
  DiscoveryRequest,
} from '../../src/controllers/discovery.controller';
import { FluoraApiService } from '../../src/services';

// Mock the FluoraApiService
vi.mock('../../src/services/fluora-api.service');

describe('DiscoveryController', () => {
  let controller: DiscoveryController;
  let mockApiService: FluoraApiService;

  beforeEach(() => {
    vi.resetAllMocks();
    mockApiService = ({
      searchServers: vi.fn(),
      listServers: vi.fn(),
      getServerInfo: vi.fn(),
      validateServerUrl: vi.fn(),
    } as unknown) as FluoraApiService;

    // Replace the FluoraApiService constructor with our mock
    vi.mocked(FluoraApiService).mockImplementation(() => mockApiService);

    controller = new DiscoveryController();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  describe('handleSearchFluora', () => {
    it('should return servers that match the filter', async () => {
      const request: DiscoveryRequest = { name: 'test-server' };
      const mockServers = [
        { id: '1', name: 'test-server-1' },
        { id: '2', name: 'test-server-2' },
      ];

      mockApiService.searchServers.mockResolvedValue(mockServers);

      const result = await controller.handleSearchFluora(request);

      expect(mockApiService.searchServers).toHaveBeenCalledWith({
        name: 'test-server',
      });
      expect(result).toEqual({
        success: true,
        data: mockServers,
        count: 2,
      });
    });

    it('should handle errors', async () => {
      const request: DiscoveryRequest = { name: 'test-server' };
      const error = new Error('API error');

      mockApiService.searchServers.mockRejectedValue(error);

      const result = await controller.handleSearchFluora(request);

      expect(mockApiService.searchServers).toHaveBeenCalledWith({
        name: 'test-server',
      });
      expect(result).toEqual({
        success: false,
        error: 'Failed to search Fluora servers: API error',
      });
    });
  });

  describe('handleListServers', () => {
    it('should return filtered servers', async () => {
      const request: DiscoveryRequest = {
        name: 'test',
        category: 'AI',
      };
      const mockServers = [
        { id: '1', name: 'test-1', category: 'AI' },
        { id: '2', name: 'test-2', category: 'AI' },
      ];

      mockApiService.listServers.mockResolvedValue(mockServers);

      const result = await controller.handleListServers(request);

      expect(mockApiService.listServers).toHaveBeenCalledWith({
        name: 'test',
        category: 'AI',
      });
      expect(result).toEqual({
        success: true,
        data: mockServers,
        count: 2,
      });
    });

    it('should handle errors', async () => {
      const request: DiscoveryRequest = { category: 'AI' };
      const error = new Error('API error');

      mockApiService.listServers.mockRejectedValue(error);

      const result = await controller.handleListServers(request);

      expect(mockApiService.listServers).toHaveBeenCalledWith({
        category: 'AI',
        name: undefined,
      });
      expect(result).toEqual({
        success: false,
        error: 'Failed to list servers: API error',
      });
    });
  });

  describe('handleGetServerInfo', () => {
    it('should return server info for valid server ID', async () => {
      const request: DiscoveryRequest = { serverId: 'server-123' };
      const mockServer = { id: 'server-123', name: 'Test Server' };

      mockApiService.getServerInfo.mockResolvedValue(mockServer);

      const result = await controller.handleGetServerInfo(request);

      expect(mockApiService.getServerInfo).toHaveBeenCalledWith('server-123');
      expect(result).toEqual({
        success: true,
        data: mockServer,
      });
    });

    it('should return error if serverId is missing', async () => {
      const request: DiscoveryRequest = {};

      const result = await controller.handleGetServerInfo(request);

      expect(mockApiService.getServerInfo).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: false,
        error: 'serverId is required for getServerInfo operation',
      });
    });

    it('should return error if server not found', async () => {
      const request: DiscoveryRequest = { serverId: 'nonexistent' };

      mockApiService.getServerInfo.mockResolvedValue(null);

      const result = await controller.handleGetServerInfo(request);

      expect(mockApiService.getServerInfo).toHaveBeenCalledWith('nonexistent');
      expect(result).toEqual({
        success: false,
        error: 'Server with ID nonexistent not found',
      });
    });

    it('should handle API errors', async () => {
      const request: DiscoveryRequest = { serverId: 'server-123' };
      const error = new Error('API error');

      mockApiService.getServerInfo.mockRejectedValue(error);

      const result = await controller.handleGetServerInfo(request);

      expect(mockApiService.getServerInfo).toHaveBeenCalledWith('server-123');
      expect(result).toEqual({
        success: false,
        error: 'Failed to get server info: API error',
      });
    });
  });

  describe('validateServerUrl', () => {
    it('should call API service validateServerUrl', async () => {
      const url = 'https://test-server.com';

      mockApiService.validateServerUrl.mockResolvedValue(true);

      const result = await controller.validateServerUrl(url);

      expect(mockApiService.validateServerUrl).toHaveBeenCalledWith(url);
      expect(result).toBe(true);
    });

    it('should return false when validation fails', async () => {
      const url = 'https://invalid-server.com';

      mockApiService.validateServerUrl.mockResolvedValue(false);

      const result = await controller.validateServerUrl(url);

      expect(mockApiService.validateServerUrl).toHaveBeenCalledWith(url);
      expect(result).toBe(false);
    });
  });
});
