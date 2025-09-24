import { describe, it, expect } from 'vitest';
import {
  precheckSuccessSchema,
  precheckFailSchema,
  executeSuccessSchema,
  executeFailSchema,
} from '../../src/schemas/results';
import { FluoraOperation } from '../../src/types/operations';

describe('Results Schemas', () => {
  describe('precheckSuccessSchema', () => {
    it('should validate valid precheck success with all fields', () => {
      const validData = {
        operationValid: true,
        serverAccessible: true,
        estimatedCost: '10.5 USDC',
        paymentMethodValid: true,
        walletAddressValid: true,
      };

      const result = precheckSuccessSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it('should validate precheck success with minimal fields', () => {
      const validData = {
        operationValid: true,
      };

      const result = precheckSuccessSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.operationValid).toBe(true);
        expect(result.data.serverAccessible).toBeUndefined();
        expect(result.data.estimatedCost).toBeUndefined();
        expect(result.data.paymentMethodValid).toBeUndefined();
        expect(result.data.walletAddressValid).toBeUndefined();
      }
    });

    it('should reject invalid operationValid type', () => {
      const invalidData = {
        operationValid: 'true',
      };

      const result = precheckSuccessSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject missing operationValid', () => {
      const invalidData = {
        serverAccessible: true,
      };

      const result = precheckSuccessSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('precheckFailSchema', () => {
    it('should validate valid precheck fail with all fields', () => {
      const validData = {
        error: 'Server not accessible',
        operationType: 'MAKE_PURCHASE',
      };

      const result = precheckFailSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it('should validate precheck fail with minimal fields', () => {
      const validData = {
        error: 'Server not accessible',
      };

      const result = precheckFailSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.error).toBe('Server not accessible');
        expect(result.data.operationType).toBeUndefined();
      }
    });

    it('should reject missing error', () => {
      const invalidData = {
        operationType: 'MAKE_PURCHASE',
      };

      const result = precheckFailSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid error type', () => {
      const invalidData = {
        error: 123,
      };

      const result = precheckFailSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('executeSuccessSchema', () => {
    it('should validate valid execute success with all fields', () => {
      const validData = {
        operation: FluoraOperation.MAKE_PURCHASE,
        result: { data: 'test result' },
        transactionHash: '0x1234567890123456789012345678901234567890123456789012345678901234',
        timestamp: 1234567890,
        serverId: 'server-123',
        cost: '10.5 USDC',
      };

      const result = executeSuccessSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it('should validate execute success with minimal fields', () => {
      const validData = {
        operation: FluoraOperation.LIST_SERVERS,
        result: { servers: [] },
        timestamp: 1234567890,
      };

      const result = executeSuccessSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.operation).toBe(FluoraOperation.LIST_SERVERS);
        expect(result.data.result).toEqual({ servers: [] });
        expect(result.data.timestamp).toBe(1234567890);
        expect(result.data.transactionHash).toBeUndefined();
        expect(result.data.serverId).toBeUndefined();
        expect(result.data.cost).toBeUndefined();
      }
    });

    it('should reject invalid operation', () => {
      const invalidData = {
        operation: 'INVALID_OPERATION',
        result: { data: 'test' },
        timestamp: 1234567890,
      };

      const result = executeSuccessSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject missing required fields', () => {
      const invalidData = {
        operation: FluoraOperation.MAKE_PURCHASE,
      };

      const result = executeSuccessSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('executeFailSchema', () => {
    it('should validate valid execute fail', () => {
      const validData = {
        error: 'Transaction failed',
        operation: FluoraOperation.MAKE_PURCHASE,
        timestamp: 1234567890,
      };

      const result = executeFailSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it('should reject invalid operation', () => {
      const invalidData = {
        error: 'Transaction failed',
        operation: 'INVALID_OPERATION',
        timestamp: 1234567890,
      };

      const result = executeFailSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject missing required fields', () => {
      const invalidData = {
        error: 'Transaction failed',
      };

      const result = executeFailSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid timestamp type', () => {
      const invalidData = {
        error: 'Transaction failed',
        operation: FluoraOperation.MAKE_PURCHASE,
        timestamp: '1234567890',
      };

      const result = executeFailSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});
