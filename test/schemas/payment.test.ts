import { describe, it, expect } from 'vitest';
import {
  PriceListingSchema,
  PaymentMethodsSchema,
  MakePurchaseSchema,
  GetPurchaseHistorySchema,
  ValidatePaymentSchema,
} from '../../src/schemas/payment';
import { FluoraOperation, PaymentMethods } from '../../src/types/operations';

describe('Payment Schemas', () => {
  describe('PriceListingSchema', () => {
    it('should validate valid price listing request', () => {
      const validRequest = {
        operation: FluoraOperation.PRICE_LISTING,
        serverId: 'server-123',
      };

      const result = PriceListingSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validRequest);
      }
    });

    it('should reject missing serverId', () => {
      const invalidRequest = {
        operation: FluoraOperation.PRICE_LISTING,
      };

      const result = PriceListingSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should reject invalid operation', () => {
      const invalidRequest = {
        operation: FluoraOperation.LIST_SERVERS,
        serverId: 'server-123',
      };

      const result = PriceListingSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });
  });

  describe('PaymentMethodsSchema', () => {
    it('should validate valid payment methods request', () => {
      const validRequest = {
        operation: FluoraOperation.PAYMENT_METHODS,
        serverId: 'server-123',
      };

      const result = PaymentMethodsSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validRequest);
      }
    });

    it('should reject missing serverId', () => {
      const invalidRequest = {
        operation: FluoraOperation.PAYMENT_METHODS,
      };

      const result = PaymentMethodsSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });
  });

  describe('MakePurchaseSchema', () => {
    it('should validate valid make purchase request', () => {
      const validRequest = {
        operation: FluoraOperation.MAKE_PURCHASE,
        serverId: 'server-123',
        itemPrice: '10.5',
        serverWalletAddress: '0x1234567890123456789012345678901234567890',
      };

      const result = MakePurchaseSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validRequest);
      }
    });

    it('should validate integer price', () => {
      const validRequest = {
        operation: FluoraOperation.MAKE_PURCHASE,
        serverId: 'server-123',
        itemPrice: '10',
        serverWalletAddress: '0x1234567890123456789012345678901234567890',
      };

      const result = MakePurchaseSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('should reject invalid price format', () => {
      const invalidRequest = {
        operation: FluoraOperation.MAKE_PURCHASE,
        serverId: 'server-123',
        itemPrice: 'invalid-price',
        serverWalletAddress: '0x1234567890123456789012345678901234567890',
      };

      const result = MakePurchaseSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should reject invalid wallet address', () => {
      const invalidRequest = {
        operation: FluoraOperation.MAKE_PURCHASE,
        serverId: 'server-123',
        itemPrice: '10.5',
        serverWalletAddress: 'invalid-address',
      };

      const result = MakePurchaseSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should reject missing required fields', () => {
      const invalidRequest = {
        operation: FluoraOperation.MAKE_PURCHASE,
        serverId: 'server-123',
      };

      const result = MakePurchaseSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });
  });

  describe('GetPurchaseHistorySchema', () => {
    it('should validate valid get purchase history request with user address', () => {
      const validRequest = {
        operation: FluoraOperation.GET_PURCHASE_HISTORY,
        userAddress: '0x1234567890123456789012345678901234567890',
      };

      const result = GetPurchaseHistorySchema.safeParse(validRequest);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validRequest);
      }
    });

    it('should validate get purchase history request without user address', () => {
      const validRequest = {
        operation: FluoraOperation.GET_PURCHASE_HISTORY,
      };

      const result = GetPurchaseHistorySchema.safeParse(validRequest);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.operation).toBe(FluoraOperation.GET_PURCHASE_HISTORY);
        expect(result.data.userAddress).toBeUndefined();
      }
    });

    it('should reject invalid user address', () => {
      const invalidRequest = {
        operation: FluoraOperation.GET_PURCHASE_HISTORY,
        userAddress: 'invalid-address',
      };

      const result = GetPurchaseHistorySchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });
  });

  describe('ValidatePaymentSchema', () => {
    it('should validate valid validate payment request', () => {
      const validRequest = {
        operation: FluoraOperation.VALIDATE_PAYMENT,
        transactionHash: '0x1234567890123456789012345678901234567890123456789012345678901234',
        paymentMethod: PaymentMethods.USDC_BASE_MAINNET,
      };

      const result = ValidatePaymentSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validRequest);
      }
    });

    it('should reject invalid transaction hash', () => {
      const invalidRequest = {
        operation: FluoraOperation.VALIDATE_PAYMENT,
        transactionHash: 'invalid-hash',
        paymentMethod: PaymentMethods.USDC_BASE_MAINNET,
      };

      const result = ValidatePaymentSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should reject invalid payment method', () => {
      const invalidRequest = {
        operation: FluoraOperation.VALIDATE_PAYMENT,
        transactionHash: '0x1234567890123456789012345678901234567890123456789012345678901234',
        paymentMethod: 'INVALID_METHOD',
      };

      const result = ValidatePaymentSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should reject missing required fields', () => {
      const invalidRequest = {
        operation: FluoraOperation.VALIDATE_PAYMENT,
      };

      const result = ValidatePaymentSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });
  });
});
