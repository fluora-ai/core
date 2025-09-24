import { PaymentMethods } from '../types/operations.js';

import {
  getCurrencyFromPaymentMethod,
  createSignedTransaction,
  getNetworkFromPaymentMethod,
  createx402PaymentRequirements,
  verifyPayment,
  settlePayment,
} from '../utils/index.js';

export enum PaymentStatus {
  COMPLETED = 'completed',
  FAILED = 'failed',
  PENDING = 'pending',
}

export interface PaymentTransaction {
  status: PaymentStatus;
  transactionHash: string;
  amount: string;
  currency: string;
  chain: string;
  fromAddress: string | null;
  toAddress: string;
  timestamp: number;
}

export interface SignedTransaction {
  signedTransaction: string;
  paymentMethod: PaymentMethods;
  amount: string;
  recipientAddress: string;
}

export interface ServicePaymentDetails {
  amount: number;
  recipientAddress: string;
}

export interface AvailablePaymentMethods {
  paymentMethods: PaymentMethods[];
  walletAddresses: Record<PaymentMethods, `0x${string}`>;
}

/**
 * Service for handling blockchain payments via lit-protocol
 * Replaces the PaymentsTools from monetized-mcp-sdk
 */
export class BlockchainPaymentService {

  constructor(public readonly paymentMethods?: AvailablePaymentMethods){}

  /**
   * Sign a payment transaction using x402
   * This replaces PaymentsTools.signTransaction from monetized-mcp-sdk
   */
  async signPaymentTransaction(
    amount: number,
    recipientAddress: string,
    paymentMethod: PaymentMethods,
    pkpPrivateKey?: string
  ): Promise<SignedTransaction> {
    console.warn('[blockchain-payment.service] Signing payment transaction:', {
      amount,
      recipientAddress,
      paymentMethod,
    });

    const signedTransaction = await createSignedTransaction(
      amount,
      recipientAddress,
      paymentMethod,
      pkpPrivateKey
    );

    return {
      signedTransaction: signedTransaction,
      paymentMethod,
      amount: amount.toString(),
      recipientAddress,
    };
  }

  /**
   * Validate and settle a payment transaction on-chain
   */
  async validateAndSettlePayment(
    { amount, recipientAddress }: ServicePaymentDetails,
    paymentMethod: PaymentMethods,
    transactionHash: string
  ): Promise<PaymentTransaction> {
    const result: PaymentTransaction = {
      status: PaymentStatus.PENDING,
      transactionHash,
      amount: `${amount}`,
      currency: getCurrencyFromPaymentMethod(paymentMethod),
      chain: getNetworkFromPaymentMethod(paymentMethod),
      fromAddress: null,
      toAddress: recipientAddress,
      timestamp: Date.now(),
    };

    try {
      console.warn('[blockchain-payment.service] Validating payment:', {
        transactionHash,
        paymentMethod,
      });

      // Verify
      const paymentRequirements = createx402PaymentRequirements(
        amount,
        paymentMethod,
        recipientAddress
      );

      const verifyResponse = await verifyPayment(
        transactionHash,
        paymentRequirements
      );

      if (!verifyResponse.success) {
        console.error('Payment verification failed:', verifyResponse.message);
        result.status = PaymentStatus.FAILED;
        return result;
      }

      // Settle
      if (!verifyResponse.payload) {
        throw new Error('No valid payload returned from payment verification');
      }
      const settleResponse = await settlePayment(
        verifyResponse.payload,
        paymentRequirements
      );

      if (settleResponse.success) {
        console.error('Payment settled successfully:', settleResponse);
        result.status = PaymentStatus.COMPLETED;
        result.fromAddress = verifyResponse.payload.payload.authorization.from;
      } else {
        result.status = PaymentStatus.FAILED;
      }
      return result;
    } catch (error) {
      console.error('Error validating and settling payment:', error);
      result.status = PaymentStatus.FAILED;
      return result;
    }
  }
}
