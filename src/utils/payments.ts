import { PaymentMethods } from '../types/operations.js';
import { base, baseSepolia, Chain } from 'viem/chains';
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

export function getCurrencyFromPaymentMethod(
  paymentMethod: PaymentMethods
): string {
  return paymentMethod.split('_')[0]; // 'USDC'
}

export function getChainFromPaymentMethod(
  paymentMethod: PaymentMethods
): Chain {
  switch (paymentMethod) {
    case PaymentMethods.USDC_BASE_MAINNET:
      return base;
    case PaymentMethods.USDC_BASE_SEPOLIA:
      return baseSepolia;
    default:
      throw new Error(`Unsupported payment method: ${paymentMethod as string}`);
  }
}

export function getNetworkFromPaymentMethod(
  paymentMethod: PaymentMethods
): string {
  switch (paymentMethod) {
    case PaymentMethods.USDC_BASE_MAINNET:
      return 'base';
    case PaymentMethods.USDC_BASE_SEPOLIA:
      return 'base-sepolia';
    default:
      throw new Error(`Unsupported payment method: ${paymentMethod as string}`);
  }
}

/**
 * Create signed transaction using x402
 */
export async function createSignedTransaction(
  amount: number,
  _recipientAddress: string,
  paymentMethod: PaymentMethods,
  _pkpPrivateKey?: string // Buyer private key
): Promise<string> {
  try {
    const currency = getCurrencyFromPaymentMethod(paymentMethod);
    const chain = getChainFromPaymentMethod(paymentMethod);

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
    const paymentRequirements = createx402PaymentRequirements(
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

export function createx402PaymentRequirements(
  amount: number,
  paymentMethod: PaymentMethods,
  recipientAddress: string
): PaymentRequirements {
  const network = getNetworkFromPaymentMethod(paymentMethod) as Network;
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

export async function verifyPayment(
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

export async function settlePayment(
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
