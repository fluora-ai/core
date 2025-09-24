import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  DiscoveryController,
  DiscoveryRequest,
} from '../../src/controllers/discovery.controller';
import { FluoraApiService, ServiceRegistryService } from '../../src/services';
import {
  McpServer,
  ServiceRegistry,
  EnrichedService,
} from '../../src/types/registry';

// Mock the services
vi.mock('../../src/services/fluora-api.service');
vi.mock('../../src/services/service-registry.service');

describe('DiscoveryController', () => {
  let controller: DiscoveryController;
  let mockApiService: FluoraApiService;
  let mockRegistryService: ServiceRegistryService;

  beforeEach(() => {
    vi.resetAllMocks();
    mockApiService = ({
      searchServers: vi.fn(),
      listServers: vi.fn(),
      getServerInfo: vi.fn(),
      validateServerUrl: vi.fn(),
    } as unknown) as FluoraApiService;

    mockRegistryService = ({
      exploreAndEnrichServices: vi.fn(),
      findServiceById: vi.fn(),
      validateServiceExecution: vi.fn(),
      groupServicesByCategory: vi.fn(),
      getServiceStatistics: vi.fn(),
    } as unknown) as ServiceRegistryService;

    // Replace the service constructors with our mocks
    vi.mocked(FluoraApiService).mockImplementation(() => mockApiService);
    vi.mocked(ServiceRegistryService).mockImplementation(
      () => mockRegistryService
    );

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

  describe('handleExploreServices', () => {
    it('should explore and enrich services from servers', async () => {
      const mockServers: McpServer[] = [
        {
          id: 'server1',
          name: 'Test Server',
          description: 'Test server',
          mcpServerUrl: 'https://test.com',
          verified: true,
          categories: 'AI',
        },
      ];

      const mockRegistry: ServiceRegistry = {
        totalServersExplored: 1,
        totalServicesFound: 2,
        services: [],
        metadata: {
          exploredAt: new Date().toISOString(),
          errors: [],
        },
      };

      mockRegistryService.exploreAndEnrichServices.mockResolvedValue(
        mockRegistry
      );

      const result = await controller.handleExploreServices(
        mockServers,
        'AI',
        5,
        false
      );

      expect(mockRegistryService.exploreAndEnrichServices).toHaveBeenCalledWith(
        mockServers,
        'AI',
        5,
        false
      );
      expect(result).toBe(mockRegistry);
    });
  });

  describe('findServiceById', () => {
    it('should find service by ID', () => {
      const services: EnrichedService[] = [
        {
          id: 'service1',
          name: 'Test Service',
          description: 'Test',
          price: { amount: 10, paymentMethod: 'USDC_BASE_MAINNET' },
          params: {},
          serverInfo: {
            mcpServerUrl: 'https://test.com',
            serverId: 'server1',
            serverName: 'Test Server',
            verified: true,
            categories: 'Test',
          },
          paymentInfo: {
            walletAddress: '0x123',
            paymentMethod: 'USDC_BASE_MAINNET',
          },
          executionReady: true,
          category: 'Test',
        },
      ];

      const mockService = services[0];
      mockRegistryService.findServiceById.mockReturnValue(mockService);

      const result = controller.findServiceById(services, 'service1');

      expect(mockRegistryService.findServiceById).toHaveBeenCalledWith(
        services,
        'service1'
      );
      expect(result).toBe(mockService);
    });
  });

  describe('validateServiceExecution', () => {
    it('should validate service execution', () => {
      const service: EnrichedService = {
        id: 'service1',
        name: 'Test Service',
        description: 'Test',
        price: { amount: 10, paymentMethod: 'USDC_BASE_MAINNET' },
        params: {},
        serverInfo: {
          mcpServerUrl: 'https://test.com',
          serverId: 'server1',
          serverName: 'Test Server',
          verified: true,
          categories: 'Test',
        },
        paymentInfo: {
          walletAddress: '0x123',
          paymentMethod: 'USDC_BASE_MAINNET',
        },
        executionReady: true,
        category: 'Test',
      };

      mockRegistryService.validateServiceExecution.mockImplementation(() => {});

      controller.validateServiceExecution(service);

      expect(mockRegistryService.validateServiceExecution).toHaveBeenCalledWith(
        service
      );
    });
  });

  describe('groupServicesByCategory', () => {
    it('should group services by category', () => {
      const services: EnrichedService[] = [
        {
          id: 'service1',
          name: 'AI Service',
          description: 'Test',
          price: { amount: 10, paymentMethod: 'USDC_BASE_MAINNET' },
          params: {},
          serverInfo: {
            mcpServerUrl: 'https://test.com',
            serverId: 'server1',
            serverName: 'Test Server',
            verified: true,
            categories: 'AI',
          },
          paymentInfo: {
            walletAddress: '0x123',
            paymentMethod: 'USDC_BASE_MAINNET',
          },
          executionReady: true,
          category: 'AI',
        },
      ];

      const mockGrouped = { AI: services };
      mockRegistryService.groupServicesByCategory.mockReturnValue(mockGrouped);

      const result = controller.groupServicesByCategory(services);

      expect(mockRegistryService.groupServicesByCategory).toHaveBeenCalledWith(
        services
      );
      expect(result).toBe(mockGrouped);
    });
  });

  describe('getServiceStatistics', () => {
    it('should get service statistics', () => {
      const registry: ServiceRegistry = {
        totalServersExplored: 2,
        totalServicesFound: 3,
        services: [],
        metadata: {
          exploredAt: new Date().toISOString(),
          errors: [],
        },
      };

      const mockStats = {
        totalServices: 3,
        executionReadyServices: 2,
        categoriesCount: 2,
        serversWithErrors: 0,
        averageServicesPerServer: 2,
      };

      mockRegistryService.getServiceStatistics.mockReturnValue(mockStats);

      const result = controller.getServiceStatistics(registry);

      expect(mockRegistryService.getServiceStatistics).toHaveBeenCalledWith(
        registry
      );
      expect(result).toBe(mockStats);
    });
  });
});
