import { z } from 'zod';
import { FluoraOperation } from '../types/operations.js';
import {
  SearchServerSchema,
  ListServersSchema,
  GetServerInfoSchema,
  ListToolsSchema,
} from './discovery.js';
import {
  PriceListingSchema,
  PaymentMethodsSchema,
  MakePurchaseSchema,
  GetPurchaseHistorySchema,
  ValidatePaymentSchema,
} from './payment.js';
import { CallServerToolSchema } from './tool.js';

// Re-export individual schemas
export {
  SearchServerSchema,
  ListServersSchema,
  GetServerInfoSchema,
  CallServerToolSchema,
  ListToolsSchema,
  PriceListingSchema,
  PaymentMethodsSchema,
  MakePurchaseSchema,
  GetPurchaseHistorySchema,
  ValidatePaymentSchema,
};

/**
 * Discriminated union created from individual schema objects
 */
export const fluoraOperationSchema = z.discriminatedUnion('operation', [
  SearchServerSchema,
  ListServersSchema,
  GetServerInfoSchema,
  PriceListingSchema,
  PaymentMethodsSchema,
  MakePurchaseSchema,
  CallServerToolSchema,
  ListToolsSchema,
  GetPurchaseHistorySchema,
  ValidatePaymentSchema,
]);

/**
 * Create a Zod enum schema for FluoraOperation
 */
export const FluoraOperationSchema = z.nativeEnum(FluoraOperation);

/**
 * Create a map schema where keys are FluoraOperation and values are descriptions
 */
export const OperationDescriptionSchema = z.record(
  FluoraOperationSchema,
  z.string()
);

// Type exports
export type ToolParams = z.infer<typeof fluoraOperationSchema>;
export type OperationDescriptions = z.infer<typeof OperationDescriptionSchema>;
