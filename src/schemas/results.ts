import { z } from 'zod';
import { FluoraOperation } from '../types/operations.js';

// Result schemas
export const precheckSuccessSchema = z.object({
  operationValid: z.boolean(),
  serverAccessible: z.boolean().optional(),
  estimatedCost: z.string().optional(),
  paymentMethodValid: z.boolean().optional(),
  walletAddressValid: z.boolean().optional(),
});

export const precheckFailSchema = z.object({
  error: z.string(),
  operationType: z.string().optional(),
});

export const executeSuccessSchema = z.object({
  operation: z.nativeEnum(FluoraOperation),
  result: z.unknown(),
  transactionHash: z.string().optional(),
  timestamp: z.number(),
  serverId: z.string().optional(),
  cost: z.string().optional(),
});

export const executeFailSchema = z.object({
  error: z.string(),
  operation: z.nativeEnum(FluoraOperation),
  timestamp: z.number(),
});

// Type exports
export type PrecheckSuccess = z.infer<typeof precheckSuccessSchema>;
export type PrecheckFail = z.infer<typeof precheckFailSchema>;
export type ExecuteSuccess = z.infer<typeof executeSuccessSchema>;
export type ExecuteFail = z.infer<typeof executeFailSchema>;
