import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ExecutionController,
  ExecutionRequest,
} from '../../src/controllers/execution.controller';
import { McpGatewayService } from '../../src/services/mcp-gateway.service';
import { BlockchainPaymentService } from '../../src/services/blockchain-payment.service';
import { FluoraOperation, PaymentMethods } from '../../src/schemas';

// Mock dependencies
vi.mock('../../src/services/mcp-gateway.service');
vi.mock('../../src/services/blockchain-payment.service');

describe('ExecutionController', () => {
  let controller: ExecutionController;
  let mockMcpGateway: McpGatewayService;
  let mockPaymentService: BlockchainPaymentService;

  beforeEach(() => {
    vi.resetAllMocks();

    // Create mock implementations
    mockMcpGateway = ({
      getConnection: vi.fn(),
      callServerTool: vi.fn(),
      listServerTools: vi.fn(),
      closeAllConnections: vi.fn(),
      closeConnection: vi.fn(),
    } as unknown) as McpGatewayService;

    mockPaymentService = ({
      signPaymentTransaction: vi.fn(),
      validatePayment: vi.fn(),
      getPaymentMethods: vi.fn(),
    } as unknown) as BlockchainPaymentService;

    // Replace constructors with our mocks
    vi.mocked(McpGatewayService).mockImplementation(() => mockMcpGateway);
    vi.mocked(BlockchainPaymentService).mockImplementation(
      () => mockPaymentService
    );

    controller = new ExecutionController();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('handlePriceListing', () => {
    it('should call price-listing tool and return results', async () => {
      const request: ExecutionRequest = {
        serverId: 'server-123',
        mcpServerUrl: 'https://test-server.com',
        operation: FluoraOperation.PRICE_LISTING,
      };

      const mockPriceData = {
        tools: {
          'test-tool': { price: '0.1', currency: 'USDC' },
        },
      };

      mockMcpGateway.callServerTool.mockResolvedValue(mockPriceData);

      const result = await controller.handlePriceListing(request);

      expect(mockMcpGateway.callServerTool).toHaveBeenCalledWith(
        'https://test-server.com',
        FluoraOperation.PRICE_LISTING,
        {}
      );

      expect(result).toEqual({
        success: true,
        data: mockPriceData,
      });
    });

    it('should handle errors', async () => {
      const request: ExecutionRequest = {
        serverId: 'server-123',
        mcpServerUrl: 'https://test-server.com',
      };

      mockMcpGateway.callServerTool.mockRejectedValue(
        new Error('Connection failed')
      );

      const result = await controller.handlePriceListing(request);

      expect(result).toEqual({
        success: false,
        error: 'Failed to get price listing: Connection failed',
      });
    });
  });

  describe('handlePaymentMethods', () => {
    it('should call payment-methods tool and return results', async () => {
      const request: ExecutionRequest = {
        serverId: 'server-123',
        mcpServerUrl: 'https://test-server.com',
        operation: FluoraOperation.PAYMENT_METHODS,
      };

      const mockPaymentMethodsData = {
        paymentMethods: ['USDC_BASE_MAINNET'],
        walletAddresses: {
          USDC_BASE_MAINNET: '0xwallet',
        },
      };

      mockMcpGateway.callServerTool.mockResolvedValue(mockPaymentMethodsData);

      const result = await controller.handlePaymentMethods(request);

      expect(mockMcpGateway.callServerTool).toHaveBeenCalledWith(
        'https://test-server.com',
        FluoraOperation.PAYMENT_METHODS,
        {}
      );

      expect(result).toEqual({
        success: true,
        data: mockPaymentMethodsData,
      });
    });

    it('should handle errors', async () => {
      const request: ExecutionRequest = {
        serverId: 'server-123',
        mcpServerUrl: 'https://test-server.com',
      };

      mockMcpGateway.callServerTool.mockRejectedValue(
        new Error('Connection failed')
      );

      const result = await controller.handlePaymentMethods(request);

      expect(result).toEqual({
        success: false,
        error: 'Failed to get payment methods: Connection failed',
      });
    });
  });

  describe('handleMakePurchase', () => {
    it('should validate required parameters', async () => {
      const request: ExecutionRequest = {
        serverId: 'server-123',
        mcpServerUrl: 'https://test-server.com',
        operation: FluoraOperation.MAKE_PURCHASE,
        // Missing required parameters
      };

      const result = await controller.handleMakePurchase(request);

      expect(mockPaymentService.signPaymentTransaction).not.toHaveBeenCalled();
      expect(mockMcpGateway.callServerTool).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: false,
        error:
          'itemPrice, serverWalletAddress, and paymentMethod are required for make-purchase',
      });
    });

    it('should sign transaction and call make-purchase tool', async () => {
      const request: ExecutionRequest = {
        serverId: 'server-123',
        mcpServerUrl: 'https://test-server.com',
        itemPrice: '0.1',
        serverWalletAddress: '0xserverWallet',
        paymentMethod: PaymentMethods.USDC_BASE_MAINNET,
        operation: FluoraOperation.MAKE_PURCHASE,
        args: { toolName: 'test-tool' },
      };

      const mockSignedPayment = {
        signedTransaction: '0xsignedTx',
        paymentMethod: PaymentMethods.USDC_BASE_MAINNET,
        amount: '0.1',
        recipientAddress: '0xserverWallet',
      };

      const mockPurchaseResult = {
        result: 'success',
        toolResponse: { data: 'test-data' },
      };

      mockPaymentService.signPaymentTransaction.mockResolvedValue(
        mockSignedPayment
      );
      mockMcpGateway.callServerTool.mockResolvedValue(mockPurchaseResult);

      const result = await controller.handleMakePurchase(request);

      // Should call signPaymentTransaction with correct parameters
      expect(mockPaymentService.signPaymentTransaction).toHaveBeenCalledWith(
        0.1, // parsed from '0.1'
        '0xserverWallet',
        PaymentMethods.USDC_BASE_MAINNET,
        undefined
      );

      // Should call make-purchase with correct parameters
      expect(mockMcpGateway.callServerTool).toHaveBeenCalledWith(
        'https://test-server.com',
        FluoraOperation.MAKE_PURCHASE,
        {
          toolName: 'test-tool',
          itemPrice: '0.1',
          serverWalletAddress: '0xserverWallet',
          paymentMethod: PaymentMethods.USDC_BASE_MAINNET,
          signedTransaction: '0xsignedTx',
        }
      );

      expect(result).toEqual({
        success: true,
        data: mockPurchaseResult,
        transactionHash: '0xsignedTx',
        cost: '0.1',
      });
    });

    it('should handle errors during payment signing', async () => {
      const request: ExecutionRequest = {
        serverId: 'server-123',
        mcpServerUrl: 'https://test-server.com',
        itemPrice: '0.1',
        serverWalletAddress: '0xserverWallet',
        paymentMethod: PaymentMethods.USDC_BASE_MAINNET,
      };

      mockPaymentService.signPaymentTransaction.mockRejectedValue(
        new Error('Signing failed')
      );

      const result = await controller.handleMakePurchase(request);

      expect(mockMcpGateway.callServerTool).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: false,
        error: 'Failed to process purchase: Signing failed',
      });
    });
  });

  describe('handleCallServerTool', () => {
    it('should validate toolName parameter', async () => {
      const request: ExecutionRequest = {
        serverId: 'server-123',
        mcpServerUrl: 'https://test-server.com',
        operation: FluoraOperation.CALL_SERVER_TOOL,
        // Missing toolName
      };

      const result = await controller.handleCallServerTool(request);

      expect(mockMcpGateway.callServerTool).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: false,
        error: 'toolName is required for callServerTool operation',
      });
    });

    it('should call specified tool with args', async () => {
      const request: ExecutionRequest = {
        serverId: 'server-123',
        mcpServerUrl: 'https://test-server.com',
        toolName: 'custom-tool',
        args: { param1: 'value1' },
        operation: FluoraOperation.CALL_SERVER_TOOL,
      };

      const mockToolResult = { data: 'tool-response' };
      mockMcpGateway.callServerTool.mockResolvedValue(mockToolResult);

      const result = await controller.handleCallServerTool(request);

      expect(mockMcpGateway.callServerTool).toHaveBeenCalledWith(
        'https://test-server.com',
        'custom-tool',
        {
          param1: 'value1',
        }
      );

      expect(result).toEqual({
        success: true,
        data: mockToolResult,
      });
    });

    it('should use empty object for args if not provided', async () => {
      const request: ExecutionRequest = {
        serverId: 'server-123',
        mcpServerUrl: 'https://test-server.com',
        toolName: 'custom-tool',
        operation: FluoraOperation.CALL_SERVER_TOOL,
        // No args
      };

      const mockToolResult = { data: 'tool-response' };
      mockMcpGateway.callServerTool.mockResolvedValue(mockToolResult);

      await controller.handleCallServerTool(request);

      expect(mockMcpGateway.callServerTool).toHaveBeenCalledWith(
        'https://test-server.com',
        'custom-tool',
        {}
      );
    });

    it('should handle errors', async () => {
      const request: ExecutionRequest = {
        serverId: 'server-123',
        mcpServerUrl: 'https://test-server.com',
        toolName: 'custom-tool',
      };

      mockMcpGateway.callServerTool.mockRejectedValue(
        new Error('Tool execution failed')
      );

      const result = await controller.handleCallServerTool(request);

      expect(result).toEqual({
        success: false,
        error: 'Failed to call server tool: Tool execution failed',
      });
    });
  });

  describe('handleListTools', () => {
    it('should list tools from the server', async () => {
      const request: ExecutionRequest = {
        serverId: 'server-123',
        mcpServerUrl: 'https://test-server.com',
        operation: FluoraOperation.LIST_SERVER_TOOLS,
      };

      const mockTools = ['tool1', 'tool2', 'tool3'];
      mockMcpGateway.listServerTools.mockResolvedValue(mockTools);

      const result = await controller.handleListTools(request);

      expect(mockMcpGateway.listServerTools).toHaveBeenCalledWith(
        'https://test-server.com'
      );
      expect(result).toEqual({
        success: true,
        data: mockTools,
      });
    });

    it('should handle errors', async () => {
      const request: ExecutionRequest = {
        serverId: 'server-123',
        mcpServerUrl: 'https://test-server.com',
      };

      mockMcpGateway.listServerTools.mockRejectedValue(
        new Error('Connection failed')
      );

      const result = await controller.handleListTools(request);

      expect(result).toEqual({
        success: false,
        error: 'Failed to list server tools: Connection failed',
      });
    });
  });

  describe('validateServerAccess', () => {
    it('should return true if connection is successful', async () => {
      mockMcpGateway.getConnection.mockResolvedValue({} as any);

      const result = await controller.validateServerAccess(
        'https://test-server.com'
      );

      expect(mockMcpGateway.getConnection).toHaveBeenCalledWith(
        'https://test-server.com'
      );
      expect(result).toBe(true);
    });

    it('should return false if connection fails', async () => {
      mockMcpGateway.getConnection.mockRejectedValue(
        new Error('Connection failed')
      );

      const result = await controller.validateServerAccess(
        'https://test-server.com'
      );

      expect(mockMcpGateway.getConnection).toHaveBeenCalledWith(
        'https://test-server.com'
      );
      expect(result).toBe(false);
      expect(console.warn).toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should close all connections', async () => {
      await controller.cleanup();

      expect(mockMcpGateway.closeAllConnections).toHaveBeenCalled();
    });
  });
});
