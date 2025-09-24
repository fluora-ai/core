import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

export interface MCPServerTool {
  name: string;
  description: string;
  schema: z.ZodRawShape;
  execute: (...args: unknown[]) => Promise<CallToolResult>;
}

export type McpServer = {
  id: string;
  name: string;
  description: string;
  website: string;
  verified: boolean;
  walletAddress: string;
  mcpServerUrl: string;
  category?: string;
};

export type McpServersFilter = {
  name?: string;
  category?: string;
};
