import { describe, it, expect } from 'vitest';
import {
  SearchServerSchema,
  ListServersSchema,
  GetServerInfoSchema,
  ListToolsSchema,
} from '../../src/schemas/discovery';
import { FluoraOperation } from '../../src/types/operations';

describe('Discovery Schemas', () => {
  describe('SearchServerSchema', () => {
    it('should validate valid search server request', () => {
      const validRequest = {
        operation: FluoraOperation.SEARCH_FLUORA,
        name: 'test-server',
      };

      const result = SearchServerSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validRequest);
      }
    });

    it('should validate search server request without name', () => {
      const validRequest = {
        operation: FluoraOperation.SEARCH_FLUORA,
      };

      const result = SearchServerSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.operation).toBe(FluoraOperation.SEARCH_FLUORA);
        expect(result.data.name).toBeUndefined();
      }
    });

    it('should reject invalid operation', () => {
      const invalidRequest = {
        operation: FluoraOperation.LIST_SERVERS,
        name: 'test-server',
      };

      const result = SearchServerSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should reject missing operation', () => {
      const invalidRequest = {
        name: 'test-server',
      };

      const result = SearchServerSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });
  });

  describe('ListServersSchema', () => {
    it('should validate valid list servers request', () => {
      const validRequest = {
        operation: FluoraOperation.LIST_SERVERS,
        category: 'AI',
      };

      const result = ListServersSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validRequest);
      }
    });

    it('should validate list servers request without category', () => {
      const validRequest = {
        operation: FluoraOperation.LIST_SERVERS,
      };

      const result = ListServersSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.operation).toBe(FluoraOperation.LIST_SERVERS);
        expect(result.data.category).toBeUndefined();
      }
    });

    it('should reject invalid operation', () => {
      const invalidRequest = {
        operation: FluoraOperation.SEARCH_FLUORA,
        category: 'AI',
      };

      const result = ListServersSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });
  });

  describe('GetServerInfoSchema', () => {
    it('should validate valid get server info request', () => {
      const validRequest = {
        operation: FluoraOperation.GET_SERVER_INFO,
        serverId: 'server-123',
      };

      const result = GetServerInfoSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validRequest);
      }
    });

    it('should reject missing serverId', () => {
      const invalidRequest = {
        operation: FluoraOperation.GET_SERVER_INFO,
      };

      const result = GetServerInfoSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should reject invalid operation', () => {
      const invalidRequest = {
        operation: FluoraOperation.LIST_SERVERS,
        serverId: 'server-123',
      };

      const result = GetServerInfoSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });
  });

  describe('ListToolsSchema', () => {
    it('should validate valid list tools request', () => {
      const validRequest = {
        operation: FluoraOperation.LIST_TOOLS,
        serverId: 'server-123',
      };

      const result = ListToolsSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validRequest);
      }
    });

    it('should reject missing serverId', () => {
      const invalidRequest = {
        operation: FluoraOperation.LIST_TOOLS,
      };

      const result = ListToolsSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should reject invalid operation', () => {
      const invalidRequest = {
        operation: FluoraOperation.GET_SERVER_INFO,
        serverId: 'server-123',
      };

      const result = ListToolsSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });
  });
});
