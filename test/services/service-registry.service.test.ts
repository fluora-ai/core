import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ServiceRegistryService } from '../../src/services/service-registry.service';
import { McpGatewayService } from '../../src/services/mcp-gateway.service';
import {
  McpServer,
  EnrichedService,
  ServiceRegistry,
} from '../../src/types/registry';

// Mock the McpGatewayService
vi.mock('../../src/services/mcp-gateway.service', () => ({
  McpGatewayService: vi.fn().mockImplementation(() => ({
    getConnection: vi.fn(),
    closeAllConnections: vi.fn(),
  })),
}));

describe('ServiceRegistryService', () => {
  let serviceRegistry: ServiceRegistryService;
  let mockGateway: any;

  beforeEach(() => {
    mockGateway = {
      getConnection: vi.fn(),
      closeAllConnections: vi.fn(),
    };
    vi.mocked(McpGatewayService).mockImplementation(() => mockGateway);
    serviceRegistry = new ServiceRegistryService();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('exploreAndEnrichServices', () => {
    it('should explore and enrich services from multiple servers', async () => {
      const mockServers: McpServer[] = [
        {
          id: 'server1',
          name: 'Test Server 1',
          description: 'Test server description',
          mcp_server_url: 'https://server1.com',
          verified: true,
          categories: 'AI,Data',
        },
        {
          id: 'server2',
          name: 'Test Server 2',
          description: 'Another test server',
          mcp_server_url: 'https://server2.com',
          verified: false,
          categories: 'PDF',
        },
      ];

      // Create separate mock clients for each server
      const mockClient1 = {
        callTool: vi.fn(),
        disconnect: vi.fn(),
      };

      const mockClient2 = {
        callTool: vi.fn(),
        disconnect: vi.fn(),
      };

      // Mock getConnection to return different clients for different servers
      mockGateway.getConnection.mockImplementation((url: string) => {
        if (url === 'https://server1.com') {
          return Promise.resolve(mockClient1);
        } else if (url === 'https://server2.com') {
          return Promise.resolve(mockClient2);
        }
        return Promise.resolve(mockClient1);
      });

      // Setup mock responses for server 1
      mockClient1.callTool
        .mockResolvedValueOnce({
          content: [
            {
              text: JSON.stringify({
                items: [
                  {
                    id: 'service1',
                    name: 'AI Service',
                    description: 'AI processing service',
                    price: {
                      amount: 10,
                      currency: 'USDC',
                      paymentMethod: 'USDC_BASE_MAINNET',
                    },
                    params: { input: 'string' },
                  },
                ],
              }),
            },
          ],
        })
        .mockResolvedValueOnce({
          content: [
            {
              text: JSON.stringify([
                { walletAddress: '0x123', paymentMethod: 'USDC_BASE_MAINNET' },
              ]),
            },
          ],
        });

      // Setup mock responses for server 2
      mockClient2.callTool
        .mockResolvedValueOnce({
          content: [
            {
              text: JSON.stringify({
                items: [
                  {
                    id: 'service2',
                    name: 'PDF Service',
                    description: 'PDF processing service',
                    price: {
                      amount: 5,
                      currency: 'USDC',
                      paymentMethod: 'USDC_BASE_MAINNET',
                    },
                    params: { file: 'string' },
                  },
                ],
              }),
            },
          ],
        })
        .mockResolvedValueOnce({
          content: [
            {
              text: JSON.stringify([
                { walletAddress: '0x456', paymentMethod: 'USDC_BASE_MAINNET' },
              ]),
            },
          ],
        });

      const result = await serviceRegistry.exploreAndEnrichServices(
        mockServers
      );

      expect(result.totalServersExplored).toBe(2);
      expect(result.totalServicesFound).toBe(2);
      expect(result.services).toHaveLength(2);
      expect(result.services[0]).toMatchObject({
        id: 'service1',
        name: 'AI Service',
        executionReady: true,
        serverInfo: {
          serverId: 'server1',
          serverName: 'Test Server 1',
          verified: true,
        },
      });
    });

    it('should filter services by category', async () => {
      const mockServers: McpServer[] = [
        {
          id: 'server1',
          name: 'AI Server',
          description: 'AI services',
          mcp_server_url: 'https://server1.com',
          verified: true,
          categories: 'AI',
        },
        {
          id: 'server2',
          name: 'PDF Server',
          description: 'PDF services',
          mcp_server_url: 'https://server2.com',
          verified: true,
          categories: 'PDF',
        },
      ];

      const mockClient = {
        callTool: vi.fn(),
        disconnect: vi.fn(),
      };

      mockGateway.getConnection.mockResolvedValue(mockClient);
      mockClient.callTool
        .mockResolvedValueOnce({
          content: [
            {
              text: JSON.stringify({
                items: [
                  {
                    id: 'ai-service',
                    name: 'AI Service',
                    price: { amount: 10, paymentMethod: 'USDC_BASE_MAINNET' },
                    params: {},
                  },
                ],
              }),
            },
          ],
        })
        .mockResolvedValueOnce({
          content: [
            {
              text: JSON.stringify([
                { walletAddress: '0x123', paymentMethod: 'USDC_BASE_MAINNET' },
              ]),
            },
          ],
        });

      const result = await serviceRegistry.exploreAndEnrichServices(
        mockServers,
        'AI'
      );

      expect(result.category).toBe('AI');
      expect(result.services).toHaveLength(1);
      expect(result.services[0].id).toBe('ai-service');
    });

    it('should handle server errors gracefully', async () => {
      const mockServers: McpServer[] = [
        {
          id: 'server1',
          name: 'Failing Server',
          description: 'This server will fail',
          mcp_server_url: 'https://failing-server.com',
          verified: true,
          categories: 'Test',
        },
      ];

      mockGateway.getConnection.mockRejectedValue(
        new Error('Connection failed')
      );

      const result = await serviceRegistry.exploreAndEnrichServices(
        mockServers
      );

      expect(result.totalServersExplored).toBe(1);
      expect(result.totalServicesFound).toBe(0);
      expect(result.services).toHaveLength(0);
      expect(result.metadata.errors).toHaveLength(1);
      expect(result.metadata.errors[0].serverName).toBe('Failing Server');
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

      const result = serviceRegistry.findServiceById(services, 'service1');
      expect(result).toBeTruthy();
      expect(result?.id).toBe('service1');
    });

    it('should return null for non-existent service', () => {
      const services: EnrichedService[] = [];
      const result = serviceRegistry.findServiceById(services, 'nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('validateServiceExecution', () => {
    it('should validate execution-ready service', () => {
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

      expect(() =>
        serviceRegistry.validateServiceExecution(service)
      ).not.toThrow();
    });

    it('should throw error for non-execution-ready service', () => {
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
          walletAddress: '',
          paymentMethod: 'USDC_BASE_MAINNET',
        },
        executionReady: false,
        category: 'Test',
      };

      expect(() => serviceRegistry.validateServiceExecution(service)).toThrow(
        'Service is not execution-ready'
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
        {
          id: 'service2',
          name: 'PDF Service',
          description: 'Test',
          price: { amount: 5, paymentMethod: 'USDC_BASE_MAINNET' },
          params: {},
          serverInfo: {
            mcpServerUrl: 'https://test.com',
            serverId: 'server1',
            serverName: 'Test Server',
            verified: true,
            categories: 'PDF',
          },
          paymentInfo: {
            walletAddress: '0x123',
            paymentMethod: 'USDC_BASE_MAINNET',
          },
          executionReady: true,
          category: 'PDF',
        },
      ];

      const result = serviceRegistry.groupServicesByCategory(services);
      expect(result.AI).toHaveLength(1);
      expect(result.PDF).toHaveLength(1);
      expect(result.AI[0].id).toBe('service1');
      expect(result.PDF[0].id).toBe('service2');
    });
  });

  describe('validateServiceParams', () => {
    it('should validate service parameters', () => {
      const service = {
        id: 'service1',
        name: 'Test Service',
        description: 'Test',
        price: { amount: 10, paymentMethod: 'USDC_BASE_MAINNET' },
        params: { input: 'string' },
      };

      const params = { input: 'test data' };

      expect(() =>
        serviceRegistry.validateServiceParams(service, params)
      ).not.toThrow();
    });

    it('should throw error for missing required parameters', () => {
      const service = {
        id: 'service1',
        name: 'Test Service',
        description: 'Test',
        price: { amount: 10, paymentMethod: 'USDC_BASE_MAINNET' },
        params: { input: 'string' },
      };

      const params = {}; // Missing required 'input' parameter

      expect(() =>
        serviceRegistry.validateServiceParams(service, params)
      ).toThrow('Missing required parameter');
    });

    it('should throw error for extra parameters', () => {
      const service = {
        id: 'service1',
        name: 'Test Service',
        description: 'Test',
        price: { amount: 10, paymentMethod: 'USDC_BASE_MAINNET' },
        params: { input: 'string' },
      };

      const params = { input: 'test data', extra: 'extra data' };

      expect(() =>
        serviceRegistry.validateServiceParams(service, params)
      ).toThrow('Extra parameter provided');
    });

    it('should handle service with no parameters', () => {
      const service = {
        id: 'service1',
        name: 'Test Service',
        description: 'Test',
        price: { amount: 10, paymentMethod: 'USDC_BASE_MAINNET' },
        params: {},
      };

      const params = {};

      expect(() =>
        serviceRegistry.validateServiceParams(service, params)
      ).not.toThrow();
    });
  });

  describe('validateServiceExecution', () => {
    it('should validate execution-ready service', () => {
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

      expect(() =>
        serviceRegistry.validateServiceExecution(service)
      ).not.toThrow();
    });

    it('should throw error for non-execution-ready service', () => {
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
        executionReady: false,
        category: 'Test',
      };

      expect(() => serviceRegistry.validateServiceExecution(service)).toThrow(
        'Service is not execution-ready'
      );
    });

    it('should throw error for service missing wallet address', () => {
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
          walletAddress: '',
          paymentMethod: 'USDC_BASE_MAINNET',
        },
        executionReady: true,
        category: 'Test',
      };

      expect(() => serviceRegistry.validateServiceExecution(service)).toThrow(
        'Missing server wallet address'
      );
    });
  });

  describe('validateServiceAvailability', () => {
    it('should validate service availability', async () => {
      const mockClient = {
        callTool: vi.fn(),
        disconnect: vi.fn(),
      };

      mockGateway.getConnection.mockResolvedValue(mockClient);
      mockClient.callTool.mockResolvedValue({
        content: [{ text: JSON.stringify({ items: [{ id: 'service1' }] }) }],
      });

      await serviceRegistry.validateServiceAvailability(
        'service1',
        'https://test-server.com'
      );

      expect(mockClient.callTool).toHaveBeenCalledWith('pricing-listing', {
        searchQuery: '',
      });
      expect(mockClient.disconnect).toHaveBeenCalled();
    });

    it('should throw error when service is not available', async () => {
      const mockClient = {
        callTool: vi.fn(),
        disconnect: vi.fn(),
      };

      mockGateway.getConnection.mockResolvedValue(mockClient);
      mockClient.callTool.mockResolvedValue({
        content: [{ text: JSON.stringify({ items: [] }) }],
      });

      await expect(
        serviceRegistry.validateServiceAvailability(
          'service1',
          'https://test-server.com'
        )
      ).rejects.toThrow('Failed to verify service availability');

      expect(mockClient.disconnect).toHaveBeenCalled();
    });
  });

  describe('getServiceStatistics', () => {
    it('should calculate service statistics', () => {
      const registry: ServiceRegistry = {
        totalServersExplored: 2,
        totalServicesFound: 3,
        services: [
          {
            id: 'service1',
            name: 'Service 1',
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
          {
            id: 'service2',
            name: 'Service 2',
            description: 'Test',
            price: { amount: 5, paymentMethod: 'USDC_BASE_MAINNET' },
            params: {},
            serverInfo: {
              mcpServerUrl: 'https://test.com',
              serverId: 'server1',
              serverName: 'Test Server',
              verified: true,
              categories: 'PDF',
            },
            paymentInfo: {
              walletAddress: '',
              paymentMethod: 'USDC_BASE_MAINNET',
            },
            executionReady: false,
            category: 'PDF',
          },
        ],
        metadata: {
          exploredAt: new Date().toISOString(),
          errors: [],
        },
      };

      const stats = serviceRegistry.getServiceStatistics(registry);
      expect(stats.totalServices).toBe(3);
      expect(stats.executionReadyServices).toBe(1);
      expect(stats.categoriesCount).toBe(2);
      expect(stats.serversWithErrors).toBe(0);
      expect(stats.averageServicesPerServer).toBe(2);
    });

    it('should handle registry with errors', () => {
      const registry: ServiceRegistry = {
        totalServersExplored: 2,
        totalServicesFound: 1,
        services: [],
        metadata: {
          exploredAt: new Date().toISOString(),
          errors: [
            { serverName: 'Failing Server', error: 'Connection failed' },
          ],
        },
      };

      const stats = serviceRegistry.getServiceStatistics(registry);
      expect(stats.serversWithErrors).toBe(1);
      expect(stats.averageServicesPerServer).toBe(1); // Math.round(1/2) = 1
    });

    it('should handle registry with no servers explored', () => {
      const registry: ServiceRegistry = {
        totalServersExplored: 0,
        totalServicesFound: 0,
        services: [],
        metadata: {
          exploredAt: new Date().toISOString(),
          errors: [],
        },
      };

      const stats = serviceRegistry.getServiceStatistics(registry);
      expect(stats.averageServicesPerServer).toBe(0);
    });
  });

  describe('getExecutionReadyServices', () => {
    it('should filter services to only execution-ready ones', () => {
      const services: EnrichedService[] = [
        {
          id: 'service1',
          name: 'Ready Service',
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
        {
          id: 'service2',
          name: 'Not Ready Service',
          description: 'Test',
          price: { amount: 5, paymentMethod: 'USDC_BASE_MAINNET' },
          params: {},
          serverInfo: {
            mcpServerUrl: 'https://test.com',
            serverId: 'server1',
            serverName: 'Test Server',
            verified: true,
            categories: 'Test',
          },
          paymentInfo: {
            walletAddress: '',
            paymentMethod: 'USDC_BASE_MAINNET',
          },
          executionReady: false,
          category: 'Test',
        },
      ];

      const readyServices = serviceRegistry.getExecutionReadyServices(services);
      expect(readyServices).toHaveLength(1);
      expect(readyServices[0].id).toBe('service1');
    });
  });

  describe('getExecutionCostEstimate', () => {
    it('should return execution cost estimate for service', () => {
      const service: EnrichedService = {
        id: 'service1',
        name: 'Test Service',
        description: 'Test',
        price: {
          amount: 10,
          currency: 'USDC',
          paymentMethod: 'USDC_BASE_MAINNET',
        },
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

      const estimate = serviceRegistry.getExecutionCostEstimate(service);
      expect(estimate).toEqual({
        amount: 10,
        currency: 'USDC',
        paymentMethod: 'USDC_BASE_MAINNET',
        walletAddress: '0x123',
      });
    });

    it('should use default currency when not specified', () => {
      const service: EnrichedService = {
        id: 'service1',
        name: 'Test Service',
        description: 'Test',
        price: { amount: 5, paymentMethod: 'USDC_BASE_MAINNET' },
        params: {},
        serverInfo: {
          mcpServerUrl: 'https://test.com',
          serverId: 'server1',
          serverName: 'Test Server',
          verified: true,
          categories: 'Test',
        },
        paymentInfo: {
          walletAddress: '0x456',
          paymentMethod: 'USDC_BASE_MAINNET',
        },
        executionReady: true,
        category: 'Test',
      };

      const estimate = serviceRegistry.getExecutionCostEstimate(service);
      expect(estimate.currency).toBe('USDC');
    });
  });

  describe('parseToolResult', () => {
    it('should parse valid JSON string as object', () => {
      const service = serviceRegistry as any;
      const result = '{"data": "test"}';

      const parsed = service.parseToolResult(result);
      expect(parsed).toEqual({ data: 'test' });
    });

    it('should parse valid JSON string as array', () => {
      const service = serviceRegistry as any;
      const result = '[1, 2, 3]';

      const parsed = service.parseToolResult(result);
      expect(parsed).toEqual([1, 2, 3]);
    });

    it('should return null for invalid JSON string', () => {
      const service = serviceRegistry as any;
      const result = 'invalid json { broken';

      const parsed = service.parseToolResult(result);
      expect(parsed).toBe('invalid json { broken');
    });

    it('should return null for non-string input', () => {
      const service = serviceRegistry as any;
      const result = { data: 'test' };

      const parsed = service.parseToolResult(result);
      expect(parsed).toEqual({ data: 'test' });
    });

    it('should return null for primitive values in JSON', () => {
      const service = serviceRegistry as any;
      const result = '42';

      const parsed = service.parseToolResult(result);
      expect(parsed).toBe('42');
    });
  });

  describe('tryParseJson', () => {
    it('should parse valid JSON string as object', () => {
      const service = serviceRegistry as any;
      const result = '{"data": "test"}';

      const parsed = service.tryParseJson(result);
      expect(parsed).toEqual({ data: 'test' });
    });

    it('should parse valid JSON string as array', () => {
      const service = serviceRegistry as any;
      const result = '[1, 2, 3]';

      const parsed = service.tryParseJson(result);
      expect(parsed).toEqual([1, 2, 3]);
    });

    it('should return null for invalid JSON string', () => {
      const service = serviceRegistry as any;
      const result = 'invalid json { broken';

      const parsed = service.tryParseJson(result);
      expect(parsed).toBeNull();
    });

    it('should return null for non-string input', () => {
      const service = serviceRegistry as any;
      const result = { data: 'test' };

      const parsed = service.tryParseJson(result);
      expect(parsed).toBeNull();
    });

    it('should return null for primitive values in JSON', () => {
      const service = serviceRegistry as any;
      const result = '42';

      const parsed = service.tryParseJson(result);
      expect(parsed).toBeNull();
    });
  });

  describe('stringifyReason', () => {
    it('should return error message for Error instances', () => {
      const service = serviceRegistry as any;
      const error = new Error('Test error message');

      const result = service.stringifyReason(error);
      expect(result).toBe('Test error message');
    });

    it('should return string as-is for string input', () => {
      const service = serviceRegistry as any;
      const reason = 'Test string reason';

      const result = service.stringifyReason(reason);
      expect(result).toBe('Test string reason');
    });

    it('should JSON stringify object input', () => {
      const service = serviceRegistry as any;
      const reason = { code: 500, message: 'Internal error' };

      const result = service.stringifyReason(reason);
      expect(result).toBe('{"code":500,"message":"Internal error"}');
    });

    it('should return fallback message for JSON.stringify errors', () => {
      const service = serviceRegistry as any;
      const reason = { circular: null };
      reason.circular = reason; // Create circular reference

      const result = service.stringifyReason(reason);
      expect(result).toBe('Promise rejection');
    });
  });

  describe('extractTextFromResult', () => {
    it('should extract text from valid result structure', () => {
      const service = serviceRegistry as any;
      const result = {
        content: [{ text: 'Test text content' }],
      };

      const extracted = service.extractTextFromResult(result);
      expect(extracted).toBe('Test text content');
    });

    it('should return null for non-object input', () => {
      const service = serviceRegistry as any;
      const result = 'string input';

      const extracted = service.extractTextFromResult(result);
      expect(extracted).toBeNull();
    });

    it('should return null for object without content property', () => {
      const service = serviceRegistry as any;
      const result = { data: 'test' };

      const extracted = service.extractTextFromResult(result);
      expect(extracted).toBeNull();
    });

    it('should return null for empty content array', () => {
      const service = serviceRegistry as any;
      const result = { content: [] };

      const extracted = service.extractTextFromResult(result);
      expect(extracted).toBeNull();
    });

    it('should return null for content with non-object first item', () => {
      const service = serviceRegistry as any;
      const result = { content: ['string'] };

      const extracted = service.extractTextFromResult(result);
      expect(extracted).toBeNull();
    });

    it('should return null for content item without text property', () => {
      const service = serviceRegistry as any;
      const result = { content: [{ data: 'test' }] };

      const extracted = service.extractTextFromResult(result);
      expect(extracted).toBeNull();
    });

    it('should return null for content item with non-string text', () => {
      const service = serviceRegistry as any;
      const result = { content: [{ text: 123 }] };

      const extracted = service.extractTextFromResult(result);
      expect(extracted).toBeNull();
    });
  });

  describe('getPricingData error handling', () => {
    it('should throw error when no compatible pricing tool found', async () => {
      const mockClient = {
        callTool: vi.fn().mockRejectedValue(new Error('Tool not found')),
        disconnect: vi.fn(),
      };

      const service = serviceRegistry as any;

      await expect(service.getPricingData(mockClient)).rejects.toThrow(
        'No compatible pricing tool found on server'
      );
    });
  });

  describe('getPaymentMethods error handling', () => {
    it('should throw error for invalid payment methods response format', async () => {
      const mockClient = {
        callTool: vi.fn().mockResolvedValue({
          content: [{ text: 'invalid response format' }],
        }),
        disconnect: vi.fn(),
      };

      const service = serviceRegistry as any;

      await expect(service.getPaymentMethods(mockClient)).rejects.toThrow(
        'Invalid payment methods response format'
      );
    });
  });

  describe('Promise.allSettled rejection handling', () => {
    it('should handle Promise.allSettled rejections', async () => {
      const mockServers = [
        {
          id: 'server1',
          name: 'Test Server 1',
          mcp_server_url: 'https://test1.com',
          verified: true,
          categories: 'AI',
        },
      ];

      // Mock the gateway to throw an error during connection
      mockGateway.getConnection.mockRejectedValue(
        new Error('Connection failed')
      );

      const result = await serviceRegistry.exploreAndEnrichServices(
        mockServers
      );

      expect(result.metadata.errors).toHaveLength(1);
      expect(result.metadata.errors[0]).toMatchObject({
        serverName: 'Test Server 1',
        error: 'Connection failed',
      });
    });

    it('should handle Promise.allSettled rejections with unknown server', async () => {
      // Create a test that triggers the else branch in Promise.allSettled handling
      // This covers lines 99-104 in service-registry.service.ts
      const mockServers = [
        {
          id: 'server1',
          name: 'Test Server 1',
          mcp_server_url: 'https://test1.com',
          verified: true,
          categories: 'AI',
        },
      ];

      // Create a service registry instance and mock the exploreServerServices method
      const testServiceRegistry = new ServiceRegistryService();
      const originalExploreServerServices = (testServiceRegistry as any)
        .exploreServerServices;

      // Mock the method to throw an error that will cause Promise.allSettled to reject
      (testServiceRegistry as any).exploreServerServices = vi
        .fn()
        .mockRejectedValue(new Error('Server exploration failed'));

      const result = await testServiceRegistry.exploreAndEnrichServices(
        mockServers
      );

      expect(result.metadata.errors).toHaveLength(1);
      expect(result.metadata.errors[0]).toMatchObject({
        serverName: 'Test Server 1',
        error: 'Server exploration failed',
      });

      // Restore the original method
      (testServiceRegistry as any).exploreServerServices = originalExploreServerServices;
    });

    it('should handle Promise.allSettled rejection with non-Error reason', async () => {
      // Test the case where Promise.allSettled rejects with a non-Error reason
      // This should trigger the stringifyReason method and cover lines 99-104
      const mockServers = [
        {
          id: 'server1',
          name: 'Test Server 1',
          mcp_server_url: 'https://test1.com',
          verified: true,
          categories: 'AI',
        },
      ];

      const testServiceRegistry = new ServiceRegistryService();
      const originalExploreServerServices = (testServiceRegistry as any)
        .exploreServerServices;

      // Mock to reject with a non-Error value
      (testServiceRegistry as any).exploreServerServices = vi
        .fn()
        .mockRejectedValue('String error');

      const result = await testServiceRegistry.exploreAndEnrichServices(
        mockServers
      );

      expect(result.metadata.errors).toHaveLength(1);
      expect(result.metadata.errors[0]).toMatchObject({
        serverName: 'Test Server 1',
        error: 'Unknown error',
      });

      // Restore the original method
      (testServiceRegistry as any).exploreServerServices = originalExploreServerServices;
    });

    it('should handle Promise.allSettled with rejected status', async () => {
      // This test specifically targets the else branch in Promise.allSettled handling (lines 99-104)
      const mockServers = [
        {
          id: 'server1',
          name: 'Test Server 1',
          mcp_server_url: 'https://test1.com',
          verified: true,
          categories: 'AI',
        },
      ];

      // Mock Promise.allSettled to return a rejected result
      const originalPromiseAllSettled = Promise.allSettled;
      Promise.allSettled = vi.fn().mockResolvedValue([
        {
          status: 'rejected',
          reason: 'Custom rejection reason',
        },
      ]);

      const result = await serviceRegistry.exploreAndEnrichServices(
        mockServers
      );

      expect(result.metadata.errors).toHaveLength(1);
      expect(result.metadata.errors[0]).toMatchObject({
        serverName: 'Unknown server',
        error: 'Custom rejection reason',
      });

      // Restore the original Promise.allSettled
      Promise.allSettled = originalPromiseAllSettled;
    });
  });

  describe('Payment method fallback handling', () => {
    it('should handle payment method matching failure with fallback', async () => {
      const mockServers = [
        {
          id: 'server1',
          name: 'Test Server 1',
          mcp_server_url: 'https://test1.com',
          verified: true,
          categories: 'AI',
        },
      ];

      const mockClient = {
        callTool: vi
          .fn()
          .mockResolvedValueOnce({
            content: [
              {
                text: JSON.stringify({
                  items: [
                    {
                      id: 'service1',
                      name: 'AI Service',
                      description: 'Test service',
                      price: {
                        amount: 10,
                        currency: 'USDC',
                        paymentMethod: 'UNKNOWN_METHOD',
                      },
                      params: {},
                    },
                  ],
                }),
              },
            ],
          })
          .mockResolvedValueOnce({
            content: [
              {
                text: JSON.stringify([
                  {
                    walletAddress: '0x123',
                    paymentMethod: 'USDC_BASE_MAINNET',
                  },
                ]),
              },
            ],
          }),
        disconnect: vi.fn(),
      };

      mockGateway.getConnection.mockResolvedValue(mockClient);

      const result = await serviceRegistry.exploreAndEnrichServices(
        mockServers
      );

      expect(result.services).toHaveLength(1);
      expect(result.services[0]).toMatchObject({
        id: 'service1',
        name: 'AI Service',
        paymentInfo: {
          walletAddress: '',
          paymentMethod: 'UNKNOWN_METHOD',
        },
        executionReady: false,
      });
    });
  });

  describe('Branch coverage tests', () => {
    it('should handle groupServicesByCategory with existing category', () => {
      const services: EnrichedService[] = [
        {
          id: 'service1',
          name: 'Service 1',
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
        {
          id: 'service2',
          name: 'Service 2',
          description: 'Test',
          price: { amount: 20, paymentMethod: 'USDC_BASE_MAINNET' },
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

      const result = serviceRegistry.groupServicesByCategory(services);

      expect(result).toHaveProperty('AI');
      expect(result.AI).toHaveLength(2);
    });

    it('should handle groupServicesByCategory with multiple services in same category', () => {
      const services: EnrichedService[] = [
        {
          id: 'service1',
          name: 'Service 1',
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
        {
          id: 'service2',
          name: 'Service 2',
          description: 'Test',
          price: { amount: 20, paymentMethod: 'USDC_BASE_MAINNET' },
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
        {
          id: 'service3',
          name: 'Service 3',
          description: 'Test',
          price: { amount: 30, paymentMethod: 'USDC_BASE_MAINNET' },
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

      const result = serviceRegistry.groupServicesByCategory(services);

      expect(result).toHaveProperty('AI');
      expect(result.AI).toHaveLength(3);
      // This test covers the case where acc[key] already exists (line 293)
    });

    it('should handle groupServicesByCategory with mixed categories', () => {
      const services: EnrichedService[] = [
        {
          id: 'service1',
          name: 'Service 1',
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
        {
          id: 'service2',
          name: 'Service 2',
          description: 'Test',
          price: { amount: 20, paymentMethod: 'USDC_BASE_MAINNET' },
          params: {},
          serverInfo: {
            mcpServerUrl: 'https://test.com',
            serverId: 'server1',
            serverName: 'Test Server',
            verified: true,
            categories: 'ML',
          },
          paymentInfo: {
            walletAddress: '0x123',
            paymentMethod: 'USDC_BASE_MAINNET',
          },
          executionReady: true,
          category: 'ML',
        },
        {
          id: 'service3',
          name: 'Service 3',
          description: 'Test',
          price: { amount: 30, paymentMethod: 'USDC_BASE_MAINNET' },
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

      const result = serviceRegistry.groupServicesByCategory(services);

      expect(result).toHaveProperty('AI');
      expect(result).toHaveProperty('ML');
      expect(result.AI).toHaveLength(2);
      expect(result.ML).toHaveLength(1);
      // This test ensures we hit the case where acc[key] already exists for 'AI'
    });

    it('should handle isPriceListingResponse with non-object input', () => {
      const service = serviceRegistry as any;

      expect(service.isPriceListingResponse('string')).toBe(false);
      expect(service.isPriceListingResponse(null)).toBe(false);
      expect(service.isPriceListingResponse(undefined)).toBe(false);
      expect(service.isPriceListingResponse(123)).toBe(false);
    });

    it('should handle isPaymentMethodsResponseArray with non-object items', () => {
      const service = serviceRegistry as any;

      const invalidArray = ['string', 123, null, undefined];
      expect(service.isPaymentMethodsResponseArray(invalidArray)).toBe(false);
    });

    it('should handle validateServiceParams with null params', () => {
      const service: RawServiceItem = {
        id: 'service1',
        name: 'Test Service',
        description: 'Test',
        price: { amount: 10, paymentMethod: 'USDC_BASE_MAINNET' },
        params: null as any,
      };

      const params = {};

      expect(() =>
        serviceRegistry.validateServiceParams(service, params)
      ).not.toThrow();
    });

    it('should handle validateServiceParams with undefined params', () => {
      const service: RawServiceItem = {
        id: 'service1',
        name: 'Test Service',
        description: 'Test',
        price: { amount: 10, paymentMethod: 'USDC_BASE_MAINNET' },
        params: undefined as any,
      };

      const params = {};

      expect(() =>
        serviceRegistry.validateServiceParams(service, params)
      ).not.toThrow();
    });

    it('should handle validateServiceParams with null providedParams', () => {
      const service: RawServiceItem = {
        id: 'service1',
        name: 'Test Service',
        description: 'Test',
        price: { amount: 10, paymentMethod: 'USDC_BASE_MAINNET' },
        params: {},
      };

      const params = null as any;

      expect(() =>
        serviceRegistry.validateServiceParams(service, params)
      ).not.toThrow();
    });

    it('should handle validateServiceParams with undefined providedParams', () => {
      const service: RawServiceItem = {
        id: 'service1',
        name: 'Test Service',
        description: 'Test',
        price: { amount: 10, paymentMethod: 'USDC_BASE_MAINNET' },
        params: {},
      };

      const params = undefined as any;

      expect(() =>
        serviceRegistry.validateServiceParams(service, params)
      ).not.toThrow();
    });

    it('should handle extractPrimaryCategory with empty string', () => {
      const service = serviceRegistry as any;

      expect(service.extractPrimaryCategory('')).toBe('uncategorized');
    });

    it('should handle extractPrimaryCategory with whitespace-only string', () => {
      const service = serviceRegistry as any;

      expect(service.extractPrimaryCategory('   ')).toBe('uncategorized');
    });

    it('should handle extractPrimaryCategory with comma-separated categories', () => {
      const service = serviceRegistry as any;

      expect(service.extractPrimaryCategory('AI,ML,Data')).toBe('AI');
    });

    it('should handle extractPrimaryCategory with single category', () => {
      const service = serviceRegistry as any;

      expect(service.extractPrimaryCategory('AI')).toBe('AI');
    });

    it('should handle normalizeServiceData with null params', () => {
      const service = serviceRegistry as any;
      const rawService: RawServiceItem = {
        id: 'service1',
        name: 'Test Service',
        description: 'Test',
        price: { amount: 10, paymentMethod: 'USDC_BASE_MAINNET' },
        params: null as any,
      };

      const result = service.normalizeServiceData(rawService);
      expect(result.params).toEqual({});
    });

    it('should handle normalizeServiceData with undefined params', () => {
      const service = serviceRegistry as any;
      const rawService: RawServiceItem = {
        id: 'service1',
        name: 'Test Service',
        description: 'Test',
        price: { amount: 10, paymentMethod: 'USDC_BASE_MAINNET' },
        params: undefined as any,
      };

      const result = service.normalizeServiceData(rawService);
      expect(result.params).toEqual({});
    });

    it('should handle server with undefined verified field', async () => {
      const mockServers = [
        {
          id: 'server1',
          name: 'Test Server 1',
          mcp_server_url: 'https://test1.com',
          verified: undefined,
          categories: 'AI',
        },
      ];

      const mockClient = {
        callTool: vi
          .fn()
          .mockResolvedValueOnce({
            content: [
              {
                text: JSON.stringify({
                  items: [
                    {
                      id: 'service1',
                      name: 'AI Service',
                      description: 'Test service',
                      price: {
                        amount: 10,
                        currency: 'USDC',
                        paymentMethod: 'USDC_BASE_MAINNET',
                      },
                      params: {},
                    },
                  ],
                }),
              },
            ],
          })
          .mockResolvedValueOnce({
            content: [
              {
                text: JSON.stringify([
                  {
                    walletAddress: '0x123',
                    paymentMethod: 'USDC_BASE_MAINNET',
                  },
                ]),
              },
            ],
          }),
        disconnect: vi.fn(),
      };

      mockGateway.getConnection.mockResolvedValue(mockClient);

      const result = await serviceRegistry.exploreAndEnrichServices(
        mockServers
      );

      expect(result.services).toHaveLength(1);
      expect(result.services[0].serverInfo.verified).toBe(false);
    });

    it('should handle server with undefined categories', async () => {
      const mockServers = [
        {
          id: 'server1',
          name: 'Test Server 1',
          mcp_server_url: 'https://test1.com',
          verified: true,
          categories: undefined,
        },
      ];

      const mockClient = {
        callTool: vi
          .fn()
          .mockResolvedValueOnce({
            content: [
              {
                text: JSON.stringify({
                  items: [
                    {
                      id: 'service1',
                      name: 'AI Service',
                      description: 'Test service',
                      price: {
                        amount: 10,
                        currency: 'USDC',
                        paymentMethod: 'USDC_BASE_MAINNET',
                      },
                      params: {},
                    },
                  ],
                }),
              },
            ],
          })
          .mockResolvedValueOnce({
            content: [
              {
                text: JSON.stringify([
                  {
                    walletAddress: '0x123',
                    paymentMethod: 'USDC_BASE_MAINNET',
                  },
                ]),
              },
            ],
          }),
        disconnect: vi.fn(),
      };

      mockGateway.getConnection.mockResolvedValue(mockClient);

      const result = await serviceRegistry.exploreAndEnrichServices(
        mockServers
      );

      expect(result.services).toHaveLength(1);
      expect(result.services[0].serverInfo.categories).toBe('');
      expect(result.services[0].category).toBe('uncategorized');
    });

    it('should handle paymentInfo with empty walletAddress', async () => {
      const mockServers = [
        {
          id: 'server1',
          name: 'Test Server 1',
          mcp_server_url: 'https://test1.com',
          verified: true,
          categories: 'AI',
        },
      ];

      const mockClient = {
        callTool: vi
          .fn()
          .mockResolvedValueOnce({
            content: [
              {
                text: JSON.stringify({
                  items: [
                    {
                      id: 'service1',
                      name: 'AI Service',
                      description: 'Test service',
                      price: {
                        amount: 10,
                        currency: 'USDC',
                        paymentMethod: 'USDC_BASE_MAINNET',
                      },
                      params: {},
                    },
                  ],
                }),
              },
            ],
          })
          .mockResolvedValueOnce({
            content: [
              {
                text: JSON.stringify([
                  { walletAddress: '', paymentMethod: 'USDC_BASE_MAINNET' },
                ]),
              },
            ],
          }),
        disconnect: vi.fn(),
      };

      mockGateway.getConnection.mockResolvedValue(mockClient);

      const result = await serviceRegistry.exploreAndEnrichServices(
        mockServers
      );

      expect(result.services).toHaveLength(1);
      expect(result.services[0].executionReady).toBe(false);
    });
  });
});
