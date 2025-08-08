import { PaymentMethods } from '../schemas.js';
import {
  BlockchainPaymentService,
  PaymentTransaction,
} from '../services/index.js';

export interface PaymentRequest {
  transactionHash?: string;
  paymentMethod?: PaymentMethods;
  userAddress?: string;
  amount?: number; // Amount in smallest unit (e.g., wei for ETH, cents for USD)
}

export interface PaymentResult {
  success: boolean;
  data?: unknown;
  error?: string;
  transactionHash?: string;
}

/**
 * PaymentController - Handles payment validation and history operations
 * Provides blockchain-native payment management via lit-protocol
 */
export class PaymentController {
  private readonly paymentService: BlockchainPaymentService;

  constructor() {
    this.paymentService = new BlockchainPaymentService();
  }

  /**
   * Validate and settle a payment transaction on the blockchain
   */
  async handleValidatePayment(request: PaymentRequest): Promise<PaymentResult> {
    try {
      if (
        !request.transactionHash ||
        !request.paymentMethod ||
        !request.amount ||
        !request.userAddress
      ) {
        return {
          success: false,
          error:
            'transactionHash, paymentMethod, amount, and userAddress are required for payment validation',
        };
      }

      console.warn(
        '[payment-controller] Validating payment:',
        request.transactionHash
      );

      const transaction = await this.paymentService.validateAndSettlePayment(
        {
          amount: request.amount,
          recipientAddress: request.userAddress,
        },
        request.paymentMethod,
        request.transactionHash
      );

      if (!transaction) {
        return {
          success: false,
          error: 'Payment transaction not found or invalid',
        };
      }

      return {
        success: true,
        data: transaction,
        transactionHash: request.transactionHash,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to validate payment: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Get purchase history for a user address
   */
  async handleGetPurchaseHistory(
    request: PaymentRequest
  ): Promise<PaymentResult> {
    try {
      console.warn(
        '[payment-controller] Getting purchase history for:',
        request.userAddress
      );

      // TODO: Implement actual purchase history retrieval from blockchain
      // This would query transaction history for the user's address
      const mockHistory: PaymentTransaction[] = await Promise.resolve([]);

      return {
        success: true,
        data: mockHistory,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get purchase history: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Get available payment methods and wallet addresses
   */
  async getPaymentMethods(): Promise<PaymentResult> {
    try {
      console.warn('[payment-controller] Getting available payment methods');

      const paymentData = await this.paymentService.getPaymentMethods();

      return {
        success: true,
        data: paymentData,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get payment methods: ${(error as Error).message}`,
      };
    }
  }
}
