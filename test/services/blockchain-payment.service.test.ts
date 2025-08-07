import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BlockchainPaymentService } from '../../src/services/blockchain-payment.service';
import { PaymentMethods } from '../../src/schemas';

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
    },
  },
}));

vi.mock('x402/shared', () => ({
  processPriceToAtomicAmount: vi.fn(() => ({
    maxAmountRequired: '100000000',
    asset: { address: '0xassetaddress' },
  })),
}));

describe('BlockchainPaymentService', () => {
  let service: BlockchainPaymentService;

  beforeEach(() => {
    service = new BlockchainPaymentService();
    // Spy on console.log to avoid cluttering test output
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('signPaymentTransaction', () => {
    it('should sign a transaction and return the correct format', async () => {
      // Spy on the private method
      const createSignedTransactionSpy = vi.spyOn(
        service as any,
        'createSignedTransaction'
      );
      createSignedTransactionSpy.mockResolvedValue('0xmockedSignedTransaction');

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

      expect(createSignedTransactionSpy).toHaveBeenCalledWith(
        amount,
        recipientAddress,
        paymentMethod,
        undefined
      );
    });

    it('should pass pkpPrivateKey to createSignedTransaction when provided', async () => {
      const createSignedTransactionSpy = vi.spyOn(
        service as any,
        'createSignedTransaction'
      );
      createSignedTransactionSpy.mockResolvedValue('0xmockedSignedTransaction');

      const pkpPrivateKey = 'privateKey123';
      await service.signPaymentTransaction(
        100,
        '0xrecipient',
        PaymentMethods.USDC_BASE_MAINNET,
        pkpPrivateKey
      );

      expect(createSignedTransactionSpy).toHaveBeenCalledWith(
        100,
        '0xrecipient',
        PaymentMethods.USDC_BASE_MAINNET,
        pkpPrivateKey
      );
    });
  });

  describe('validatePayment', () => {
    it('should return transaction details when validation succeeds', async () => {
      const transactionHash = '0xtransactionHash';
      const paymentMethod = PaymentMethods.USDC_BASE_MAINNET;

      // Spy on the private methods
      vi.spyOn(service as any, 'getCurrencyFromPaymentMethod').mockReturnValue(
        'USDC'
      );
      vi.spyOn(service as any, 'getNetworkFromPaymentMethod').mockReturnValue(
        'base'
      );

      const result = await service.validatePayment(
        transactionHash,
        paymentMethod
      );

      expect(result).toMatchObject({
        transactionHash,
        currency: 'USDC',
        chain: 'base',
      });
    });

    it('should return null when validation fails', async () => {
      // Mock implementation to throw an error
      vi.spyOn(
        service as any,
        'getCurrencyFromPaymentMethod'
      ).mockImplementation(() => {
        throw new Error('Validation error');
      });

      const result = await service.validatePayment(
        '0xtransactionHash',
        PaymentMethods.USDC_BASE_MAINNET
      );

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('getPaymentMethods', () => {
    it('should return available payment methods and wallet addresses', async () => {
      const result = await service.getPaymentMethods();

      expect(result).toHaveProperty('paymentMethods');
      expect(result).toHaveProperty('walletAddresses');
      expect(result.paymentMethods).toContain(PaymentMethods.USDC_BASE_MAINNET);
      expect(result.paymentMethods).toContain(PaymentMethods.USDC_BASE_SEPOLIA);
      expect(result.walletAddresses).toHaveProperty(
        PaymentMethods.USDC_BASE_MAINNET
      );
      expect(result.walletAddresses).toHaveProperty(
        PaymentMethods.USDC_BASE_SEPOLIA
      );
    });
  });

  describe('private methods', () => {
    describe('getCurrencyFromPaymentMethod', () => {
      it('should extract currency from payment method', () => {
        const result = (service as any).getCurrencyFromPaymentMethod(
          PaymentMethods.USDC_BASE_MAINNET
        );
        expect(result).toBe('USDC');
      });
    });

    describe('getChainFromPaymentMethod', () => {
      it('should return base chain object for BASE_MAINNET', () => {
        const result = (service as any).getChainFromPaymentMethod(
          PaymentMethods.USDC_BASE_MAINNET
        );
        expect(result).toHaveProperty('id');
        expect(result).toHaveProperty('name');
        expect(result.id).toBe(8453); // Base mainnet chain ID
      });

      it('should return base sepolia chain object for BASE_SEPOLIA', () => {
        const result = (service as any).getChainFromPaymentMethod(
          PaymentMethods.USDC_BASE_SEPOLIA
        );
        expect(result).toHaveProperty('id');
        expect(result).toHaveProperty('name');
        expect(result.id).toBe(84532); // Base sepolia chain ID
      });

      it('should throw error for unsupported payment method', () => {
        expect(() => {
          (service as any).getChainFromPaymentMethod('INVALID_METHOD');
        }).toThrow('Unsupported payment method: INVALID_METHOD');
      });
    });

    describe('getNetworkFromPaymentMethod', () => {
      it('should return base for BASE_MAINNET', () => {
        const result = (service as any).getNetworkFromPaymentMethod(
          PaymentMethods.USDC_BASE_MAINNET
        );
        expect(result).toBe('base');
      });

      it('should return base-sepolia for BASE_SEPOLIA', () => {
        const result = (service as any).getNetworkFromPaymentMethod(
          PaymentMethods.USDC_BASE_SEPOLIA
        );
        expect(result).toBe('base-sepolia');
      });

      it('should throw error for unsupported payment method', () => {
        expect(() => {
          (service as any).getNetworkFromPaymentMethod('INVALID_METHOD');
        }).toThrow('Unsupported payment method: INVALID_METHOD');
      });
    });

    describe('createSignedTransaction', () => {
      it('should create a signed transaction with correct params', async () => {
        // Mock console.warn to avoid stderr output in tests
        vi.spyOn(console, 'warn').mockImplementation(() => {});

        const result = await (service as any).createSignedTransaction(
          100,
          '0xrecipient',
          PaymentMethods.USDC_BASE_MAINNET,
          '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
        );

        expect(result).toBe('mock-payment-header');
      });

      it('should throw error when transaction creation fails', async () => {
        // Mock console.warn to avoid stderr output in tests
        vi.spyOn(console, 'warn').mockImplementation(() => {});

        // Mock an error in getCurrencyFromPaymentMethod
        vi.spyOn(
          service as any,
          'getCurrencyFromPaymentMethod'
        ).mockImplementation(() => {
          throw new Error('Mock error');
        });

        await expect(
          (service as any).createSignedTransaction(
            100,
            '0xrecipient',
            PaymentMethods.USDC_BASE_MAINNET,
            '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
          )
        ).rejects.toThrow('Failed to create signed transaction');
      });
    });

    describe('createExactPaymentRequirements', () => {
      it('should create payment requirements with correct structure', () => {
        const amount = 100;
        const paymentMethod = PaymentMethods.USDC_BASE_MAINNET;
        const recipientAddress = '0xrecipient';

        const result = (service as any).createExactPaymentRequirements(
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
        const result = (service as any).createExactPaymentRequirements(
          50,
          PaymentMethods.USDC_BASE_SEPOLIA,
          '0xrecipient'
        );

        expect(result.network).toBe('base-sepolia');
      });
    });
  });
});
