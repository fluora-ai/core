import { describe, it, expect } from 'vitest';
import { FluoraMcpClient } from '../../src/clients/fluora.mcp-client';

describe('FluoraMcpClient Interface', () => {
  // This is a TypeScript interface test to ensure the interface is properly defined
  it('should define the correct interface structure', () => {
    // Create a mock implementation to test the interface
    const mockClient: FluoraMcpClient = {
      connect: async (mcpServerUrl: string) => {
        expect(typeof mcpServerUrl).toBe('string');
      },
      disconnect: async () => {},
      callTool: async (
        toolName: string,
        toolParams?: Record<string, unknown>
      ) => {
        expect(typeof toolName).toBe('string');
        if (toolParams) {
          expect(typeof toolParams).toBe('object');
        }
        return {};
      },
      listTools: async () => {
        return {};
      },
    };

    // Verify all methods exist and have correct signatures
    expect(typeof mockClient.connect).toBe('function');
    expect(typeof mockClient.disconnect).toBe('function');
    expect(typeof mockClient.callTool).toBe('function');
    expect(typeof mockClient.listTools).toBe('function');
  });

  it('should allow implementations to return different types', () => {
    const mockClient: FluoraMcpClient = {
      connect: async () => {},
      disconnect: async () => {},
      callTool: async () => {
        // Should allow returning any type
        return 'string result';
      },
      listTools: async () => {
        // Should allow returning any type
        return { tools: [] };
      },
    };

    expect(mockClient).toBeDefined();
  });

  it('should enforce required parameters', () => {
    const mockClient: FluoraMcpClient = {
      connect: async (mcpServerUrl: string) => {
        // mcpServerUrl should be required
        expect(mcpServerUrl).toBeDefined();
      },
      disconnect: async () => {},
      callTool: async (
        toolName: string,
        toolParams?: Record<string, unknown>
      ) => {
        // toolName should be required
        expect(toolName).toBeDefined();
        // toolParams should be optional
      },
      listTools: async () => {},
    };

    expect(mockClient).toBeDefined();
  });
});
