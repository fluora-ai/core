import { describe, it, expect } from 'vitest';
import { CallServerToolSchema } from '../../src/schemas/tool';
import { FluoraOperation } from '../../src/types/operations';

describe('Tool Schemas', () => {
  describe('CallServerToolSchema', () => {
    it('should validate valid call server tool request', () => {
      const validRequest = {
        operation: FluoraOperation.CALL_SERVER_TOOL,
        serverId: 'server-123',
        toolName: 'test-tool',
        args: { input: 'test data', param: 123 },
      };

      const result = CallServerToolSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validRequest);
      }
    });

    it('should validate call server tool with empty args', () => {
      const validRequest = {
        operation: FluoraOperation.CALL_SERVER_TOOL,
        serverId: 'server-123',
        toolName: 'test-tool',
        args: {},
      };

      const result = CallServerToolSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.args).toEqual({});
      }
    });

    it('should reject invalid operation', () => {
      const invalidRequest = {
        operation: FluoraOperation.LIST_SERVERS,
        serverId: 'server-123',
        toolName: 'test-tool',
        args: { input: 'test data' },
      };

      const result = CallServerToolSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should reject missing serverId', () => {
      const invalidRequest = {
        operation: FluoraOperation.CALL_SERVER_TOOL,
        toolName: 'test-tool',
        args: { input: 'test data' },
      };

      const result = CallServerToolSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should reject missing toolName', () => {
      const invalidRequest = {
        operation: FluoraOperation.CALL_SERVER_TOOL,
        serverId: 'server-123',
        args: { input: 'test data' },
      };

      const result = CallServerToolSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should reject missing args', () => {
      const invalidRequest = {
        operation: FluoraOperation.CALL_SERVER_TOOL,
        serverId: 'server-123',
        toolName: 'test-tool',
      };

      const result = CallServerToolSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should reject invalid args type', () => {
      const invalidRequest = {
        operation: FluoraOperation.CALL_SERVER_TOOL,
        serverId: 'server-123',
        toolName: 'test-tool',
        args: 'invalid-args',
      };

      const result = CallServerToolSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });
  });
});
