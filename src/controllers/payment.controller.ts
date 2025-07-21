import { PaymentMethods } from '../schemas';
import { BlockchainPaymentService, PaymentTransaction } from '../services';

export interface PaymentRequest {
  transactionHash?: string;
  paymentMethod?: PaymentMethods;
  userAddress?: string;
}

export interface PaymentResult {
  success: boolean;
  data?: any;
  error?: string;
  transactionHash?: string;
}

/**
 * PaymentController - Handles payment validation and history operations
 * Provides blockchain-native payment management via lit-protocol
 */
export class PaymentController {
  private paymentService: BlockchainPaymentService;

  constructor() {
    this.paymentService = new BlockchainPaymentService();
  }

  /**
   * Validate a payment transaction on the blockchain
   */
  async handleValidatePayment(request: PaymentRequest): Promise<PaymentResult> {
    try {
      if (!request.transactionHash || !request.paymentMethod) {
        return {
          success: false,
          error:
            'transactionHash and paymentMethod are required for payment validation',
        };
      }

      console.log(
        '[payment-controller] Validating payment:',
        request.transactionHash
      );

      const transaction = await this.paymentService.validatePayment(
        request.transactionHash,
        request.paymentMethod
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
        error: `Failed to validate payment: ${error.message}`,
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
      console.log(
        '[payment-controller] Getting purchase history for:',
        request.userAddress
      );

      // TODO: Implement actual purchase history retrieval from blockchain
      // This would query transaction history for the user's address
      const mockHistory: PaymentTransaction[] = [];

      return {
        success: true,
        data: {
          transactions: mockHistory,
          count: mockHistory.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get purchase history: ${error.message}`,
      };
    }
  }

  /**
   * Get available payment methods and wallet addresses
   */
  async getPaymentMethods(): Promise<PaymentResult> {
    try {
      console.log('[payment-controller] Getting available payment methods');

      const paymentData = await this.paymentService.getPaymentMethods();

      return {
        success: true,
        data: paymentData,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get payment methods: ${error.message}`,
      };
    }
  }
}
