import { PaymentMethods } from '../schemas.js';
import { exact } from 'x402/schemes';
import {
  Network,
  PaymentPayload,
  PaymentRequirements,
  settleResponseHeader,
} from 'x402/types';
import { processPriceToAtomicAmount } from 'x402/shared';
import { facilitator } from '@coinbase/x402';
import { useFacilitator } from 'x402/verify';
import { http, Hex, createWalletClient, publicActions } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia, base, Chain } from 'viem/chains';

export interface PaymentTransaction {
  transactionHash: string;
  amount: string;
  currency: string;
  chain: string;
  fromAddress: string;
  toAddress: string;
  timestamp: number;
}

export interface SignedTransaction {
  signedTransaction: string;
  paymentMethod: PaymentMethods;
  amount: string;
  recipientAddress: string;
}

/**
 * Service for handling blockchain payments via lit-protocol
 * Replaces the PaymentsTools from monetized-mcp-sdk
 */
export class BlockchainPaymentService {
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

    const signedTransaction = await this.createSignedTransaction(
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
    {
      amount,
      recipientAddress,
    }: {
      amount: number;
      recipientAddress: string;
    },
    paymentMethod: PaymentMethods,
    transactionHash: string
  ): Promise<PaymentTransaction> {
    try {
      console.warn('[blockchain-payment.service] Validating payment:', {
        transactionHash,
        paymentMethod,
      });

      // Verify
      const paymentRequirements = this.createExactPaymentRequirements(
        amount,
        paymentMethod,
        recipientAddress
      );

      const verifyResponse = await this.verifyPayment(
        transactionHash,
        paymentRequirements
      );

      if (!verifyResponse.success) {
        console.error('Payment verification failed:', verifyResponse.message);
        return {
          transactionHash,
          amount: '0',
          currency: this.getCurrencyFromPaymentMethod(paymentMethod),
          chain: this.getNetworkFromPaymentMethod(paymentMethod),
          fromAddress: '0x0000000000000000000000000000000000000000',
          toAddress: recipientAddress,
          timestamp: Date.now(),
        };
      }

      // Settle
      if (!verifyResponse.payload) {
        throw new Error('No valid payload returned from payment verification');
      }
      const settleResponse = await this.settlePayment(
        verifyResponse.payload,
        paymentRequirements
      );

      if (settleResponse.success) {
        console.error('Payment settled successfully:', settleResponse);
        return {
          transactionHash,
          amount: amount.toString(),
          currency: this.getCurrencyFromPaymentMethod(paymentMethod),
          chain: this.getNetworkFromPaymentMethod(paymentMethod),
          fromAddress: verifyResponse.payload.payload.authorization.from,
          toAddress: recipientAddress,
          timestamp: Date.now(),
        };
      }
      return {
        transactionHash,
        amount: '0',
        currency: this.getCurrencyFromPaymentMethod(paymentMethod),
        chain: this.getNetworkFromPaymentMethod(paymentMethod),
        fromAddress: '0x0000000000000000000000000000000000000000',
        toAddress: recipientAddress,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('Error validating and settling payment:', error);
      return {
        transactionHash,
        amount: '0',
        currency: this.getCurrencyFromPaymentMethod(paymentMethod),
        chain: this.getNetworkFromPaymentMethod(paymentMethod),
        fromAddress: '0x0000000000000000000000000000000000000000',
        toAddress: recipientAddress,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Get available payment methods and their corresponding wallet addresses
   * This replaces the payment-methods tool from MonetizedMCPServer
   */
  async getPaymentMethods(): Promise<{
    paymentMethods: PaymentMethods[];
    walletAddresses: Record<PaymentMethods, string>;
  }> {
    return Promise.resolve({
      paymentMethods: [
        PaymentMethods.USDC_BASE_MAINNET,
        PaymentMethods.USDC_BASE_SEPOLIA,
      ],
      walletAddresses: {
        [PaymentMethods.USDC_BASE_MAINNET]:
          '0x0000000000000000000000000000000000000000', // PKP address
        [PaymentMethods.USDC_BASE_SEPOLIA]:
          '0x0000000000000000000000000000000000000000', // PKP address
      },
    });
  }

  /**
   * Create signed transaction using x402
   */
  private async createSignedTransaction(
    amount: number,
    _recipientAddress: string,
    paymentMethod: PaymentMethods,
    _pkpPrivateKey?: string // Buyer private key
  ): Promise<string> {
    try {
      const currency = this.getCurrencyFromPaymentMethod(paymentMethod);
      const chain = this.getChainFromPaymentMethod(paymentMethod);

      console.warn(
        `Creating signed ${currency} transaction on ${chain.name} for ${amount}`
      );

      // Create a wallet client for the specified chain
      const privateKey = (_pkpPrivateKey as Hex) || `0x${_pkpPrivateKey}`;
      const account = privateKeyToAccount(privateKey);
      const walletClient = createWalletClient({
        transport: http(),
        chain,
        account,
      }).extend(publicActions);

      // Create payment requirements
      const paymentRequirements = this.createExactPaymentRequirements(
        amount,
        paymentMethod,
        _recipientAddress
      );

      // Create payment header
      const paymentHeader = exact.evm.createPaymentHeader(
        walletClient,
        1,
        paymentRequirements
      );

      return paymentHeader;
    } catch (error) {
      console.error('Error creating signed transaction:', error);
      throw new Error('Failed to create signed transaction');
    }
  }

  private getCurrencyFromPaymentMethod(paymentMethod: PaymentMethods): string {
    return paymentMethod.split('_')[0]; // 'USDC'
  }

  private getChainFromPaymentMethod(paymentMethod: PaymentMethods): Chain {
    switch (paymentMethod) {
      case PaymentMethods.USDC_BASE_MAINNET:
        return base;
      case PaymentMethods.USDC_BASE_SEPOLIA:
        return baseSepolia;
      default:
        throw new Error(
          `Unsupported payment method: ${paymentMethod as string}`
        );
    }
  }

  private getNetworkFromPaymentMethod(paymentMethod: PaymentMethods): string {
    switch (paymentMethod) {
      case PaymentMethods.USDC_BASE_MAINNET:
        return 'base';
      case PaymentMethods.USDC_BASE_SEPOLIA:
        return 'base-sepolia';
      default:
        throw new Error(
          `Unsupported payment method: ${paymentMethod as string}`
        );
    }
  }

  private createExactPaymentRequirements(
    amount: number,
    paymentMethod: PaymentMethods,
    recipientAddress: string
  ): PaymentRequirements {
    const network = this.getNetworkFromPaymentMethod(paymentMethod) as Network;
    const atomicAmountForAsset = processPriceToAtomicAmount(amount, network);
    if ('error' in atomicAmountForAsset) {
      throw new Error(atomicAmountForAsset.error);
    }
    const { maxAmountRequired, asset } = atomicAmountForAsset;

    // create requirements
    const paymentRequirements: PaymentRequirements = {
      scheme: 'exact',
      network,
      maxAmountRequired,
      resource: 'https://fluora.ai',
      description: 'Payment for Fluora Marketplace',
      mimeType: 'application/json',
      payTo: recipientAddress,
      maxTimeoutSeconds: 300,
      asset: asset.address,
      outputSchema: undefined,
      extra: asset?.eip712,
    };

    return paymentRequirements;
  }

  private async verifyPayment(
    signedTransaction: string,
    paymentRequirements: PaymentRequirements
  ): Promise<{
    success: boolean;
    message: string;
    responseHeader: string;
    payload?: PaymentPayload;
    error?: string;
  }> {
    try {
      const decodedTransaction = exact.evm.decodePayment(signedTransaction);
      const { verify } = useFacilitator(facilitator);
      const response = await verify(decodedTransaction, paymentRequirements);

      if (!response.isValid) {
        console.error('Invalid payment:', response.invalidReason);
        return {
          success: false,
          message: response.invalidReason || 'Invalid payment',
          responseHeader: '',
        };
      }
      console.error('Payment verified successfully:', response);
      return {
        success: true,
        message: 'Payment verified successfully',
        responseHeader: JSON.stringify(response, null, 2),
        payload: decodedTransaction,
      };
    } catch (error) {
      console.error('Error verifying payment:', error);
      return {
        success: false,
        message: 'Error during payment verification',
        responseHeader: '',
        error: (error as Error).message,
      };
    }
  }

  private async settlePayment(
    decodedTransaction: PaymentPayload,
    paymentRequirements: PaymentRequirements
  ): Promise<{
    success: boolean;
    message: string;
    responseHeader: string;
    payload?: PaymentPayload;
    error?: string;
  }> {
    try {
      const { settle } = useFacilitator(facilitator);
      const settlement = await settle(decodedTransaction, paymentRequirements);
      const responseHeader = settleResponseHeader(settlement);
      console.error('Payment settled successfully:', settlement);
      return {
        success: true,
        message: 'Payment settled successfully',
        responseHeader,
      };
    } catch (error) {
      console.error('Error settling payment:', error);
      return {
        success: false,
        message: 'Error during payment settlement',
        responseHeader: '',
        error: (error as Error).message,
      };
    }
  }
}
