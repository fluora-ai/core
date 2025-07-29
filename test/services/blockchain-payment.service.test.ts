import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BlockchainPaymentService } from '@/services/blockchain-payment.service';
import { PaymentMethods } from '@/schemas';

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
      vi.spyOn(service as any, 'getChainFromPaymentMethod').mockReturnValue(
        'BASE_MAINNET'
      );

      const result = await service.validatePayment(
        transactionHash,
        paymentMethod
      );

      expect(result).toMatchObject({
        transactionHash,
        currency: 'USDC',
        chain: 'BASE_MAINNET',
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
      it('should extract chain from payment method', () => {
        const result = (service as any).getChainFromPaymentMethod(
          PaymentMethods.USDC_BASE_MAINNET
        );
        expect(result).toBe('BASE_MAINNET');
      });

      it('should handle payment methods with multiple underscores', () => {
        const result = (service as any).getChainFromPaymentMethod(
          PaymentMethods.USDC_BASE_SEPOLIA
        );
        expect(result).toBe('BASE_SEPOLIA');
      });
    });

    describe('createSignedTransaction', () => {
      it('should create a signed transaction with correct params', async () => {
        // Since this is a private method, we need to access it using type casting
        const getCurrencySpy = vi.spyOn(
          service as any,
          'getCurrencyFromPaymentMethod'
        );
        const getChainSpy = vi.spyOn(
          service as any,
          'getChainFromPaymentMethod'
        );

        getCurrencySpy.mockReturnValue('USDC');
        getChainSpy.mockReturnValue('BASE_MAINNET');

        const result = await (service as any).createSignedTransaction(
          100,
          '0xrecipient',
          PaymentMethods.USDC_BASE_MAINNET
        );

        expect(typeof result).toBe('string');
        expect(getCurrencySpy).toHaveBeenCalledWith(
          PaymentMethods.USDC_BASE_MAINNET
        );
        expect(getChainSpy).toHaveBeenCalledWith(
          PaymentMethods.USDC_BASE_MAINNET
        );
      });
    });
  });
});
