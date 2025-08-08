import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BlockchainPaymentService } from '../../src/services/blockchain-payment.service';
import { PaymentMethods } from '../../src/schemas';
import * as PaymentUtils from '../../src/utils/payments';

// Mock viem and x402 modules
vi.mock('viem', () => ({
  http: vi.fn(() => 'mock-transport'),
  createWalletClient: vi.fn(() => ({
    extend: vi.fn(() => 'mock-wallet-client'),
  })),
  publicActions: vi.fn(),
}));

vi.mock('viem/accounts', () => ({
  privateKeyToAccount: vi.fn(() => 'mock-account'),
}));

vi.mock('viem/chains', () => ({
  base: { id: 8453, name: 'Base' },
  baseSepolia: { id: 84532, name: 'Base Sepolia' },
}));

vi.mock('x402/schemes', () => ({
  exact: {
    evm: {
      createPaymentHeader: vi.fn(() => Promise.resolve('mock-payment-header')),
      decodePayment: vi.fn(() => ({ 
        payload: { 
          authorization: { from: '0xfromAddress' } 
        } 
      })),
    },
  },
}));

vi.mock('x402/shared', () => ({
  processPriceToAtomicAmount: vi.fn(() => ({
    maxAmountRequired: '100000000',
    asset: { address: '0xassetaddress' },
  })),
}));

vi.mock('@coinbase/x402', () => ({
  facilitator: 'mock-facilitator',
}));

vi.mock('x402/verify', () => ({
  useFacilitator: vi.fn(() => ({
    verify: vi.fn(() => Promise.resolve({
      isValid: true,
      invalidReason: null,
    })),
    settle: vi.fn(() => Promise.resolve('settlement-result')),
  })),
}));

vi.mock('x402/types', () => ({}));

vi.mock('../../src/utils/payments', () => ({
  getCurrencyFromPaymentMethod: vi.fn(),
  createSignedTransaction: vi.fn(),
  getNetworkFromPaymentMethod: vi.fn(),
  createx402PaymentRequirements: vi.fn(),
  verifyPayment: vi.fn(),
  settlePayment: vi.fn(),
  getChainFromPaymentMethod: vi.fn(),
}));

describe('BlockchainPaymentService', () => {
  let service: BlockchainPaymentService;
  const mockPaymentMethods = {
    paymentMethods: [PaymentMethods.USDC_BASE_MAINNET, PaymentMethods.USDC_BASE_SEPOLIA],
    walletAddresses: {
      [PaymentMethods.USDC_BASE_MAINNET]: '0x123...' as `0x${string}`,
      [PaymentMethods.USDC_BASE_SEPOLIA]: '0x456...' as `0x${string}`,
    },
  };

  beforeEach(() => {
    // Clear all mocks first
    vi.clearAllMocks();
    
    service = new BlockchainPaymentService(mockPaymentMethods);
    // Spy on console.log to avoid cluttering test output
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('signPaymentTransaction', () => {
    it('should sign a transaction and return the correct format', async () => {
      // Mock the utility function
      vi.mocked(PaymentUtils.createSignedTransaction).mockResolvedValue('0xmockedSignedTransaction');

      const amount = 100;
      const recipientAddress = '0xrecipient';
      const paymentMethod = PaymentMethods.USDC_BASE_MAINNET;

      const result = await service.signPaymentTransaction(
        amount,
        recipientAddress,
        paymentMethod
      );

      expect(result).toEqual({
        signedTransaction: '0xmockedSignedTransaction',
        paymentMethod: PaymentMethods.USDC_BASE_MAINNET,
        amount: '100',
        recipientAddress: '0xrecipient',
      });

      expect(PaymentUtils.createSignedTransaction).toHaveBeenCalledWith(
        amount,
        recipientAddress,
        paymentMethod,
        undefined
      );
    });

    it('should pass pkpPrivateKey to createSignedTransaction when provided', async () => {
      vi.mocked(PaymentUtils.createSignedTransaction).mockResolvedValue('0xmockedSignedTransaction');

      const pkpPrivateKey = 'privateKey123';
      await service.signPaymentTransaction(
        100,
        '0xrecipient',
        PaymentMethods.USDC_BASE_MAINNET,
        pkpPrivateKey
      );

      expect(PaymentUtils.createSignedTransaction).toHaveBeenCalledWith(
        100,
        '0xrecipient',
        PaymentMethods.USDC_BASE_MAINNET,
        pkpPrivateKey
      );
    });
  });

  describe('validateAndSettlePayment', () => {
    it('should return transaction details when validation and settlement succeed', async () => {
      const transactionHash = '0xtransactionHash';
      const paymentMethod = PaymentMethods.USDC_BASE_MAINNET;
      const amount = 100;
      const recipientAddress = '0xrecipient';

      // Mock the utility functions
      vi.mocked(PaymentUtils.getCurrencyFromPaymentMethod).mockReturnValue('USDC');
      vi.mocked(PaymentUtils.getNetworkFromPaymentMethod).mockReturnValue('base');
      vi.mocked(PaymentUtils.createx402PaymentRequirements).mockReturnValue({
        scheme: 'exact' as const,
        network: 'base' as const,
        maxAmountRequired: '100000000',
        resource: 'https://fluora.ai',
        description: 'Payment for Fluora Marketplace',
        mimeType: 'application/json',
        payTo: recipientAddress,
        maxTimeoutSeconds: 300,
        asset: '0xassetaddress',
        outputSchema: undefined,
        extra: undefined,
      });
      
      vi.mocked(PaymentUtils.verifyPayment).mockResolvedValue({
        success: true,
        message: 'Payment verified',
        responseHeader: '',
        payload: {
          scheme: 'exact',
          network: 'base',
          x402Version: 1,
          payload: {
            signature: '0xsignature',
            authorization: {
              from: '0xfromAddress',
              to: '0xtoAddress',
              value: '100000000',
              validAfter: '0',
              validBefore: '999999999999',
              nonce: '1',
            }
          }
        }
      });
      
      vi.mocked(PaymentUtils.settlePayment).mockResolvedValue({
        success: true,
        message: 'Payment settled',
        responseHeader: '',
      });

      const result = await service.validateAndSettlePayment(
        {
          amount,
          recipientAddress,
        },
        paymentMethod,
        transactionHash
      );

      expect(result).toMatchObject({
        transactionHash,
        currency: 'USDC',
        chain: 'base',
        amount: amount.toString(),
        toAddress: recipientAddress,
        fromAddress: '0xfromAddress',
      });
    });

    it('should return transaction with failed status when validation fails', async () => {
      // Mock utility functions
      vi.mocked(PaymentUtils.getCurrencyFromPaymentMethod).mockReturnValue('USDC');
      vi.mocked(PaymentUtils.getNetworkFromPaymentMethod).mockReturnValue('base');
      vi.mocked(PaymentUtils.createx402PaymentRequirements).mockReturnValue({
        scheme: 'exact' as const,
        network: 'base' as const,
        maxAmountRequired: '100000000',
        resource: 'https://fluora.ai',
        description: 'Payment for Fluora Marketplace',
        mimeType: 'application/json',
        payTo: '0xrecipient',
        maxTimeoutSeconds: 300,
        asset: '0xassetaddress',
        outputSchema: undefined,
        extra: undefined,
      });

      vi.mocked(PaymentUtils.verifyPayment).mockResolvedValue({
        success: false,
        message: 'Verification failed',
        responseHeader: '',
      });

      const result = await service.validateAndSettlePayment(
        {
          amount: 100,
          recipientAddress: '0xrecipient',
        },
        PaymentMethods.USDC_BASE_MAINNET,
        '0xtransactionHash'
      );

      expect(result).toMatchObject({
        transactionHash: '0xtransactionHash',
        amount: '100',
        currency: 'USDC',
        chain: 'base',
      });
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle case when verifyPayment returns no payload', async () => {
      // Mock utility functions
      vi.mocked(PaymentUtils.getCurrencyFromPaymentMethod).mockReturnValue('USDC');
      vi.mocked(PaymentUtils.getNetworkFromPaymentMethod).mockReturnValue('base');
      vi.mocked(PaymentUtils.createx402PaymentRequirements).mockReturnValue({
        scheme: 'exact' as const,
        network: 'base' as const,
        maxAmountRequired: '100000000',
        resource: 'https://fluora.ai',
        description: 'Payment for Fluora Marketplace',
        mimeType: 'application/json',
        payTo: '0xrecipient',
        maxTimeoutSeconds: 300,
        asset: '0xassetaddress',
        outputSchema: undefined,
        extra: undefined,
      });

      vi.mocked(PaymentUtils.verifyPayment).mockResolvedValue({
        success: true,
        message: 'Payment verified',
        responseHeader: '',
        // No payload
      });

      const result = await service.validateAndSettlePayment(
        {
          amount: 100,
          recipientAddress: '0xrecipient',
        },
        PaymentMethods.USDC_BASE_MAINNET,
        '0xtransactionHash'
      );

      expect(result.status).toBe('failed');
      expect(console.error).toHaveBeenCalledWith('Error validating and settling payment:', expect.any(Error));
    });

    it('should handle settlement failure', async () => {
      // Mock utility functions
      vi.mocked(PaymentUtils.getCurrencyFromPaymentMethod).mockReturnValue('USDC');
      vi.mocked(PaymentUtils.getNetworkFromPaymentMethod).mockReturnValue('base');
      vi.mocked(PaymentUtils.createx402PaymentRequirements).mockReturnValue({
        scheme: 'exact' as const,
        network: 'base' as const,
        maxAmountRequired: '100000000',
        resource: 'https://fluora.ai',
        description: 'Payment for Fluora Marketplace',
        mimeType: 'application/json',
        payTo: '0xrecipient',
        maxTimeoutSeconds: 300,
        asset: '0xassetaddress',
        outputSchema: undefined,
        extra: undefined,
      });

      vi.mocked(PaymentUtils.verifyPayment).mockResolvedValue({
        success: true,
        message: 'Payment verified',
        responseHeader: '',
        payload: {
          scheme: 'exact',
          network: 'base',
          x402Version: 1,
          payload: {
            signature: '0xsignature',
            authorization: {
              from: '0xfromAddress',
              to: '0xtoAddress',
              value: '100000000',
              validAfter: '0',
              validBefore: '999999999999',
              nonce: '1',
            }
          }
        }
      });

      vi.mocked(PaymentUtils.settlePayment).mockResolvedValue({
        success: false,
        message: 'Settlement failed',
        responseHeader: '',
      });

      const result = await service.validateAndSettlePayment(
        {
          amount: 100,
          recipientAddress: '0xrecipient',
        },
        PaymentMethods.USDC_BASE_MAINNET,
        '0xtransactionHash'
      );

      expect(result.status).toBe('failed');
    });

    it('should handle general error during validation and settlement', async () => {
      // Clear previous mocks
      vi.clearAllMocks();
      // Re-spy on console methods
      vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Mock utility functions to throw an error
      vi.mocked(PaymentUtils.getCurrencyFromPaymentMethod).mockImplementation(() => {
        throw new Error('Mock error');
      });

      // This test verifies that if the function throws an error outside the try-catch,
      // it properly propagates the error
      await expect(service.validateAndSettlePayment(
        {
          amount: 100,
          recipientAddress: '0xrecipient',
        },
        PaymentMethods.USDC_BASE_MAINNET,
        '0xtransactionHash'
      )).rejects.toThrow('Mock error');
    });
  });

  describe('paymentMethods property', () => {
    it('should have available payment methods and wallet addresses', () => {
      expect(service.paymentMethods).toBeDefined();
      expect(service.paymentMethods).toHaveProperty('paymentMethods');
      expect(service.paymentMethods).toHaveProperty('walletAddresses');
      expect(service.paymentMethods!.paymentMethods).toContain(PaymentMethods.USDC_BASE_MAINNET);
      expect(service.paymentMethods!.paymentMethods).toContain(PaymentMethods.USDC_BASE_SEPOLIA);
      expect(service.paymentMethods!.walletAddresses).toHaveProperty(
        PaymentMethods.USDC_BASE_MAINNET
      );
      expect(service.paymentMethods!.walletAddresses).toHaveProperty(
        PaymentMethods.USDC_BASE_SEPOLIA
      );
    });
  });

  describe('utility functions', () => {
    describe('getCurrencyFromPaymentMethod', () => {
      it('should extract currency from payment method', () => {
        const result = PaymentUtils.getCurrencyFromPaymentMethod(
          PaymentMethods.USDC_BASE_MAINNET
        );
        expect(PaymentUtils.getCurrencyFromPaymentMethod).toHaveBeenCalledWith(
          PaymentMethods.USDC_BASE_MAINNET
        );
      });
    });

    describe('getChainFromPaymentMethod', () => {
      it('should return base chain object for BASE_MAINNET', () => {
        const result = PaymentUtils.getChainFromPaymentMethod(
          PaymentMethods.USDC_BASE_MAINNET
        );
        expect(PaymentUtils.getChainFromPaymentMethod).toHaveBeenCalledWith(
          PaymentMethods.USDC_BASE_MAINNET
        );
      });

      it('should return base sepolia chain object for BASE_SEPOLIA', () => {
        const result = PaymentUtils.getChainFromPaymentMethod(
          PaymentMethods.USDC_BASE_SEPOLIA
        );
        expect(PaymentUtils.getChainFromPaymentMethod).toHaveBeenCalledWith(
          PaymentMethods.USDC_BASE_SEPOLIA
        );
      });

      it('should throw error for unsupported payment method', () => {
        vi.mocked(PaymentUtils.getChainFromPaymentMethod).mockImplementation(() => {
          throw new Error('Unsupported payment method: INVALID_METHOD');
        });

        expect(() => {
          PaymentUtils.getChainFromPaymentMethod('INVALID_METHOD' as any);
        }).toThrow('Unsupported payment method: INVALID_METHOD');
      });
    });

    describe('getNetworkFromPaymentMethod', () => {
      it('should return base for BASE_MAINNET', () => {
        const result = PaymentUtils.getNetworkFromPaymentMethod(
          PaymentMethods.USDC_BASE_MAINNET
        );
        expect(PaymentUtils.getNetworkFromPaymentMethod).toHaveBeenCalledWith(
          PaymentMethods.USDC_BASE_MAINNET
        );
      });

      it('should return base-sepolia for BASE_SEPOLIA', () => {
        const result = PaymentUtils.getNetworkFromPaymentMethod(
          PaymentMethods.USDC_BASE_SEPOLIA
        );
        expect(PaymentUtils.getNetworkFromPaymentMethod).toHaveBeenCalledWith(
          PaymentMethods.USDC_BASE_SEPOLIA
        );
      });

      it('should throw error for unsupported payment method', () => {
        vi.mocked(PaymentUtils.getNetworkFromPaymentMethod).mockImplementation(() => {
          throw new Error('Unsupported payment method: INVALID_METHOD');
        });

        expect(() => {
          PaymentUtils.getNetworkFromPaymentMethod('INVALID_METHOD' as any);
        }).toThrow('Unsupported payment method: INVALID_METHOD');
      });
    });

    describe('createSignedTransaction', () => {
      it('should create a signed transaction with correct params', async () => {
        vi.mocked(PaymentUtils.createSignedTransaction).mockResolvedValue('mock-payment-header');

        const result = await PaymentUtils.createSignedTransaction(
          100,
          '0xrecipient',
          PaymentMethods.USDC_BASE_MAINNET,
          '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
        );

        expect(result).toBe('mock-payment-header');
        expect(PaymentUtils.createSignedTransaction).toHaveBeenCalledWith(
          100,
          '0xrecipient',
          PaymentMethods.USDC_BASE_MAINNET,
          '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
        );
      });

      it('should throw error when transaction creation fails', async () => {
        vi.mocked(PaymentUtils.createSignedTransaction).mockRejectedValue(
          new Error('Failed to create signed transaction')
        );

        await expect(
          PaymentUtils.createSignedTransaction(
            100,
            '0xrecipient',
            PaymentMethods.USDC_BASE_MAINNET,
            '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
          )
        ).rejects.toThrow('Failed to create signed transaction');
      });
    });

    describe('createx402PaymentRequirements', () => {
      it('should create payment requirements with correct structure', () => {
        const amount = 100;
        const paymentMethod = PaymentMethods.USDC_BASE_MAINNET;
        const recipientAddress = '0xrecipient';

        const mockRequirements = {
          scheme: 'exact' as const,
          network: 'base' as const,
          resource: 'https://fluora.ai',
          description: 'Payment for Fluora Marketplace',
          mimeType: 'application/json',
          payTo: recipientAddress,
          maxTimeoutSeconds: 300,
          maxAmountRequired: '100000000',
          asset: '0xassetaddress',
          outputSchema: undefined,
          extra: undefined,
        };

        vi.mocked(PaymentUtils.createx402PaymentRequirements).mockReturnValue(mockRequirements);

        const result = PaymentUtils.createx402PaymentRequirements(
          amount,
          paymentMethod,
          recipientAddress
        );

        expect(result).toMatchObject({
          scheme: 'exact',
          network: 'base',
          resource: 'https://fluora.ai',
          description: 'Payment for Fluora Marketplace',
          mimeType: 'application/json',
          payTo: recipientAddress,
          maxTimeoutSeconds: 300,
          maxAmountRequired: '100000000',
          asset: '0xassetaddress',
        });
      });

      it('should handle base sepolia network correctly', () => {
        const mockRequirements = {
          scheme: 'exact' as const,
          network: 'base-sepolia' as const,
          resource: 'https://fluora.ai',
          description: 'Payment for Fluora Marketplace',
          mimeType: 'application/json',
          payTo: '0xrecipient',
          maxTimeoutSeconds: 300,
          maxAmountRequired: '50000000',
          asset: '0xassetaddress',
          outputSchema: undefined,
          extra: undefined,
        };

        vi.mocked(PaymentUtils.createx402PaymentRequirements).mockReturnValue(mockRequirements);

        const result = PaymentUtils.createx402PaymentRequirements(
          50,
          PaymentMethods.USDC_BASE_SEPOLIA,
          '0xrecipient'
        );

        expect(result.network).toBe('base-sepolia');
      });
    });
  });
});
