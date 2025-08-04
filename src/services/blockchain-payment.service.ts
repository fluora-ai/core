import { PaymentMethods } from '@/schemas';
import { exact } from 'x402/dist/cjs/schemes';
import { createPaymentHeader, x402Version } from 'x402/dist/cjs/index';
import { processPriceToAtomicAmount } from 'x402/dist/cjs/shared';
import {
  Network,
  PaymentPayload,
  PaymentRequirements,
} from 'x402/dist/cjs/types';
import { privateKeyToAccount } from 'viem/accounts';
import { Hex, createWalletClient, http, publicActions } from 'viem';
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
   * Sign a payment transaction using lit-protocol
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
   * Validate a payment transaction on-chain
   */
  async validatePayment(
    transactionHash: string,
    paymentMethod: PaymentMethods
  ): Promise<PaymentTransaction | null> {
    try {
      console.warn('[blockchain-payment.service] Validating payment:', {
        transactionHash,
        paymentMethod,
      });

      // Placeholder return - should query actual blockchain
      return await Promise.resolve({
        transactionHash,
        amount: '0',
        currency: this.getCurrencyFromPaymentMethod(paymentMethod),
        chain: this.getChainFromPaymentMethod(paymentMethod).name,
        fromAddress: '0x0000000000000000000000000000000000000000',
        toAddress: '0x0000000000000000000000000000000000000000',
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('Error validating payment:', error);
      return null;
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
    _pkpPrivateKey?: string
  ): Promise<string> {
    const currency = this.getCurrencyFromPaymentMethod(paymentMethod);
    const chain = this.getChainFromPaymentMethod(paymentMethod);

    console.warn(
      `Creating signed ${currency} transaction on ${chain} for ${amount}`
    );

    const paymentRequirements = this.createExactPaymentRequirements(
      amount,
      paymentMethod,
      _recipientAddress
    );
    const account = privateKeyToAccount(`0x${_pkpPrivateKey}` as Hex);
    const paymentHeader = await createPaymentHeader(
      account,
      x402Version,
      paymentRequirements
    );

    return await Promise.resolve(paymentHeader);
  }

  private getCurrencyFromPaymentMethod(paymentMethod: PaymentMethods): string {
    return paymentMethod.split('_')[0]; // 'USDC'
  }

  private getChainFromPaymentMethod(paymentMethod: PaymentMethods) {
    switch (paymentMethod) {
      case PaymentMethods.USDC_BASE_SEPOLIA:
        return baseSepolia;
      case PaymentMethods.USDC_BASE_MAINNET:
        return base;
      default:
        throw new Error(`Unsupported payment method: ${paymentMethod}`);
    }
  }

  private getNetworkFromPaymentMethod(paymentMethod: PaymentMethods): string {
    switch (paymentMethod) {
      case PaymentMethods.USDC_BASE_MAINNET:
        return 'base';
      case PaymentMethods.USDC_BASE_SEPOLIA:
        return 'base-sepolia';
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
      description: 'Payment for Fluora',
      mimeType: 'application/json',
      payTo: recipientAddress,
      maxTimeoutSeconds: 300,
      asset: asset.address,
      outputSchema: undefined,
    };

    return paymentRequirements;
  }
}
