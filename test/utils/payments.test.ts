import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PaymentMethods } from '../../src/types/operations';
import { base, baseSepolia } from 'viem/chains';

// Move mock creation to top-level - no hoisting issues
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
          },
        },
      })),
    },
  },
}));

vi.mock('x402/shared', () => ({
  processPriceToAtomicAmount: vi.fn((amount, network) => ({
    maxAmountRequired: (amount * 1000000).toString(),
    asset: { address: '0xassetaddress' },
  })),
}));

vi.mock('@coinbase/x402', () => ({
  facilitator: 'mock-facilitator',
}));

vi.mock('x402/verify', () => ({
  useFacilitator: vi.fn(() => ({
    verify: vi.fn(() =>
      Promise.resolve({
        isValid: true,
        invalidReason: null,
      })
    ),
    settle: vi.fn(() => Promise.resolve('settlement-result')),
  })),
}));

vi.mock('x402/types', () => ({
  settleResponseHeader: vi.fn(() => 'mock-settle-response-header'),
}));

import {
  getCurrencyFromPaymentMethod,
  getChainFromPaymentMethod,
  getNetworkFromPaymentMethod,
  createSignedTransaction,
  createx402PaymentRequirements,
  verifyPayment,
  settlePayment,
} from '../../src/utils/payments';

describe('Payment Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Spy on console methods to avoid cluttering test output
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getCurrencyFromPaymentMethod', () => {
    it('should extract USDC from USDC_BASE_MAINNET', () => {
      const result = getCurrencyFromPaymentMethod(
        PaymentMethods.USDC_BASE_MAINNET
      );
      expect(result).toBe('USDC');
    });

    it('should extract USDC from USDC_BASE_SEPOLIA', () => {
      const result = getCurrencyFromPaymentMethod(
        PaymentMethods.USDC_BASE_SEPOLIA
      );
      expect(result).toBe('USDC');
    });
  });

  describe('getChainFromPaymentMethod', () => {
    it('should return base chain for USDC_BASE_MAINNET', () => {
      const result = getChainFromPaymentMethod(
        PaymentMethods.USDC_BASE_MAINNET
      );
      expect(result).toEqual(base);
    });

    it('should return base sepolia chain for USDC_BASE_SEPOLIA', () => {
      const result = getChainFromPaymentMethod(
        PaymentMethods.USDC_BASE_SEPOLIA
      );
      expect(result).toEqual(baseSepolia);
    });

    it('should throw error for unsupported payment method', () => {
      expect(() => {
        getChainFromPaymentMethod('INVALID_METHOD' as any);
      }).toThrow('Unsupported payment method: INVALID_METHOD');
    });
  });

  describe('getNetworkFromPaymentMethod', () => {
    it('should return base for USDC_BASE_MAINNET', () => {
      const result = getNetworkFromPaymentMethod(
        PaymentMethods.USDC_BASE_MAINNET
      );
      expect(result).toBe('base');
    });

    it('should return base-sepolia for USDC_BASE_SEPOLIA', () => {
      const result = getNetworkFromPaymentMethod(
        PaymentMethods.USDC_BASE_SEPOLIA
      );
      expect(result).toBe('base-sepolia');
    });

    it('should throw error for unsupported payment method', () => {
      expect(() => {
        getNetworkFromPaymentMethod('INVALID_METHOD' as any);
      }).toThrow('Unsupported payment method: INVALID_METHOD');
    });
  });

  describe('createSignedTransaction', () => {
    it('should create a signed transaction successfully', async () => {
      const result = await createSignedTransaction(
        100,
        '0xrecipient',
        PaymentMethods.USDC_BASE_MAINNET,
        '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
      );

      expect(result).toBe('mock-payment-header');
    });

    it('should handle transaction creation with private key without 0x prefix', async () => {
      const result = await createSignedTransaction(
        100,
        '0xrecipient',
        PaymentMethods.USDC_BASE_MAINNET,
        '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
      );

      expect(result).toBe('mock-payment-header');
    });

    it('should create signed transaction for BASE_SEPOLIA', async () => {
      const result = await createSignedTransaction(
        50,
        '0xrecipient',
        PaymentMethods.USDC_BASE_SEPOLIA,
        '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
      );

      expect(result).toBe('mock-payment-header');
    });

    it('should handle errors and throw with message', async () => {
      const { exact } = await import('x402/schemes');
      vi.mocked(exact.evm.createPaymentHeader).mockImplementationOnce(() => {
        throw new Error('Transaction creation failed');
      });

      await expect(
        createSignedTransaction(
          100,
          '0xrecipient',
          PaymentMethods.USDC_BASE_MAINNET,
          '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
        )
      ).rejects.toThrow('Failed to create signed transaction');

      // Verify console.error was called
      expect(console.error).toHaveBeenCalledWith(
        'Error creating signed transaction:',
        expect.any(Error)
      );
    });

    it('should handle undefined private key fallback', async () => {
      const result = await createSignedTransaction(
        100,
        '0xrecipient',
        PaymentMethods.USDC_BASE_MAINNET,
        undefined
      );

      expect(result).toBe('mock-payment-header');
    });
  });

  describe('createx402PaymentRequirements', () => {
    it('should create payment requirements for BASE_MAINNET', () => {
      const result = createx402PaymentRequirements(
        100,
        PaymentMethods.USDC_BASE_MAINNET,
        '0xrecipient'
      );

      expect(result).toMatchObject({
        scheme: 'exact',
        network: 'base',
        maxAmountRequired: '100000000',
        resource: 'https://fluora.ai',
        description: 'Payment for Fluora Marketplace',
        mimeType: 'application/json',
        payTo: '0xrecipient',
        maxTimeoutSeconds: 300,
        asset: '0xassetaddress',
      });
    });

    it('should create payment requirements for BASE_SEPOLIA', () => {
      const result = createx402PaymentRequirements(
        50,
        PaymentMethods.USDC_BASE_SEPOLIA,
        '0xrecipient'
      );

      expect(result.network).toBe('base-sepolia');
      expect(result.maxAmountRequired).toBe('50000000');
    });

    it('should handle unsupported payment method', () => {
      expect(() => {
        createx402PaymentRequirements(
          100,
          'INVALID_METHOD' as any,
          '0xrecipient'
        );
      }).toThrow('Unsupported payment method: INVALID_METHOD');
    });

    it('should handle processPriceToAtomicAmount error', async () => {
      const { processPriceToAtomicAmount } = vi.mocked(
        await import('x402/shared')
      );
      processPriceToAtomicAmount.mockReturnValueOnce({
        error: 'Invalid price conversion',
      });

      expect(() => {
        createx402PaymentRequirements(
          100,
          PaymentMethods.USDC_BASE_MAINNET,
          '0xrecipient'
        );
      }).toThrow('Invalid price conversion');
    });
  });

  describe('verifyPayment', () => {
    it('should verify payment successfully', async () => {
      const mockRequirements = {
        scheme: 'exact' as const,
        network: 'base' as const,
        maxAmountRequired: '100000000',
        resource: 'https://fluora.ai',
        description: 'Payment for Fluora Marketplace',
        mimeType: 'application/json',
        payTo: '0xrecipient',
        maxTimeoutSeconds: 300,
        asset: '0xassetaddress',
      };

      const result = await verifyPayment(
        '0xsignedTransaction',
        mockRequirements
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('Payment verified successfully');
      expect(result.responseHeader).toBeDefined();
      expect(result.payload).toBeDefined();
    });

    it('should handle invalid payment verification', async () => {
      const { useFacilitator } = await import('x402/verify');
      vi.mocked(useFacilitator).mockReturnValueOnce({
        verify: vi.fn(() =>
          Promise.resolve({
            isValid: false,
            invalidReason: 'insufficient_funds' as const,
          })
        ),
        settle: vi.fn(),
        list: vi.fn(),
      });

      const mockRequirements = {
        scheme: 'exact' as const,
        network: 'base' as const,
        maxAmountRequired: '100000000',
        resource: 'https://fluora.ai',
        description: 'Payment for Fluora Marketplace',
        mimeType: 'application/json',
        payTo: '0xrecipient',
        maxTimeoutSeconds: 300,
        asset: '0xassetaddress',
      };

      const result = await verifyPayment(
        '0xsignedTransaction',
        mockRequirements
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('insufficient_funds');
      expect(result.responseHeader).toBe('');
    });

    it('should handle invalid payment with undefined invalidReason', async () => {
      const { useFacilitator } = await import('x402/verify');
      vi.mocked(useFacilitator).mockReturnValueOnce({
        verify: vi.fn(() =>
          Promise.resolve({
            isValid: false,
            invalidReason: undefined,
          })
        ),
        settle: vi.fn(),
        list: vi.fn(),
      });

      const mockRequirements = {
        scheme: 'exact' as const,
        network: 'base' as const,
        maxAmountRequired: '100000000',
        resource: 'https://fluora.ai',
        description: 'Payment for Fluora Marketplace',
        mimeType: 'application/json',
        payTo: '0xrecipient',
        maxTimeoutSeconds: 300,
        asset: '0xassetaddress',
      };

      const result = await verifyPayment(
        '0xsignedTransaction',
        mockRequirements
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid payment');
      expect(result.responseHeader).toBe('');
    });

    it('should handle verification error with exception', async () => {
      const { exact } = await import('x402/schemes');
      vi.mocked(exact.evm.decodePayment).mockImplementationOnce(() => {
        throw new Error('Decoding failed');
      });

      const mockRequirements = {
        scheme: 'exact' as const,
        network: 'base' as const,
        maxAmountRequired: '100000000',
        resource: 'https://fluora.ai',
        description: 'Payment for Fluora Marketplace',
        mimeType: 'application/json',
        payTo: '0xrecipient',
        maxTimeoutSeconds: 300,
        asset: '0xassetaddress',
      };

      const result = await verifyPayment(
        '0xsignedTransaction',
        mockRequirements
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('Error during payment verification');
      expect(result.responseHeader).toBe('');
      expect(result.error).toBe('Decoding failed');
    });
  });

  describe('settlePayment', () => {
    it('should settle payment successfully', async () => {
      const mockTransaction = {
        scheme: 'exact' as const,
        network: 'base' as const,
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
          },
        },
      };

      const mockRequirements = {
        scheme: 'exact' as const,
        network: 'base' as const,
        maxAmountRequired: '100000000',
        resource: 'https://fluora.ai',
        description: 'Payment for Fluora Marketplace',
        mimeType: 'application/json',
        payTo: '0xrecipient',
        maxTimeoutSeconds: 300,
        asset: '0xassetaddress',
      };

      const result = await settlePayment(mockTransaction, mockRequirements);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Payment settled successfully');
      expect(result.responseHeader).toBe('mock-settle-response-header');
    });

    it('should handle settlement error', async () => {
      const { useFacilitator } = await import('x402/verify');
      vi.mocked(useFacilitator).mockReturnValueOnce({
        verify: vi.fn(),
        settle: vi.fn(() => {
          throw new Error('Settlement failed');
        }),
        list: vi.fn(),
      });

      const mockTransaction = {
        scheme: 'exact' as const,
        network: 'base' as const,
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
          },
        },
      };

      const mockRequirements = {
        scheme: 'exact' as const,
        network: 'base' as const,
        maxAmountRequired: '100000000',
        resource: 'https://fluora.ai',
        description: 'Payment for Fluora Marketplace',
        mimeType: 'application/json',
        payTo: '0xrecipient',
        maxTimeoutSeconds: 300,
        asset: '0xassetaddress',
      };

      const result = await settlePayment(mockTransaction, mockRequirements);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Error during payment settlement');
      expect(result.responseHeader).toBe('');
      expect(result.error).toBe('Settlement failed');
    });
  });
});
