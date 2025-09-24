import { z } from 'zod';
import { FluoraOperation, PaymentMethods } from '../types/operations.js';

// Payment schemas
export const PriceListingSchema = z.object({
  operation: z.literal(FluoraOperation.PRICE_LISTING),
  serverId: z.string(),
});

export const PaymentMethodsSchema = z.object({
  operation: z.literal(FluoraOperation.PAYMENT_METHODS),
  serverId: z.string(),
});

export const MakePurchaseSchema = z.object({
  operation: z.literal(FluoraOperation.MAKE_PURCHASE),
  serverId: z.string(),
  itemPrice: z.string().regex(/^\d*\.?\d+$/, 'Invalid price format'),
  serverWalletAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid wallet address'),
});

export const GetPurchaseHistorySchema = z.object({
  operation: z.literal(FluoraOperation.GET_PURCHASE_HISTORY),
  userAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid address')
    .optional(),
});

export const ValidatePaymentSchema = z.object({
  operation: z.literal(FluoraOperation.VALIDATE_PAYMENT),
  transactionHash: z
    .string()
    .regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid transaction hash'),
  paymentMethod: z.nativeEnum(PaymentMethods),
});
