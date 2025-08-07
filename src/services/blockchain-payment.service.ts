import { PaymentMethods } from '../schemas.js';
import { exact } from 'x402/schemes';
import { Network, PaymentPayload, PaymentRequirements } from 'x402/types';
import { processPriceToAtomicAmount } from 'x402/shared';
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
   * Sign a payment transaction using lit-protocol
   * This replaces PaymentsTools.signTransaction from monetized-mcp-sdk
   */
  async signPaymentTransaction(
    amount: number,
    recipientAddress: string,
    paymentMethod: PaymentMethods,
    pkpPrivateKey?: string
  ): Promise<SignedTransaction> {
    // This will integrate with lit-protocol for transaction signing
    // For now, this is a placeholder that mirrors the existing pattern

    console.warn('[blockchain-payment.service] Signing payment transaction:', {
      amount,
      recipientAddress,
      paymentMethod,
    });

    // TODO: Implement actual lit-protocol transaction signing
    // This should replace the PaymentsTools.signTransaction call
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
      // TODO: Implement blockchain validation using lit-protocol
      // Check if transaction exists and is valid for the specified payment method

      console.warn('[blockchain-payment.service] Validating payment:', {
        transactionHash,
        paymentMethod,
      });

      // Placeholder return - should query actual blockchain
      return await Promise.resolve({
        transactionHash,
        amount: '0',
        currency: this.getCurrencyFromPaymentMethod(paymentMethod),
        chain: this.getNetworkFromPaymentMethod(paymentMethod),
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
    // TODO: Get actual wallet addresses from lit-protocol PKP
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
   * Create signed transaction using lit-protocol
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
        `Creating signed ${currency} transaction on ${chain} for ${amount}`
      );

      // Create a wallet client for the specified chain
      const privateKey =
        (_pkpPrivateKey as Hex) || (`0x${_pkpPrivateKey}` as Hex);
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
        throw new Error(`Unsupported payment method: ${paymentMethod}`);
    }
  }

  private getNetworkFromPaymentMethod(paymentMethod: PaymentMethods): string {
    switch (paymentMethod) {
      case PaymentMethods.USDC_BASE_MAINNET:
        return 'base';
      case PaymentMethods.USDC_BASE_SEPOLIA:
        return 'base-sepolia';
      default:
        throw new Error(`Unsupported payment method: ${paymentMethod}`);
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
}
