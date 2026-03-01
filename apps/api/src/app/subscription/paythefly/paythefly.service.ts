import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';

import { Injectable, Logger } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';

/**
 * PayTheFly Crypto Payment Service
 *
 * Handles crypto payment integration with PayTheFly for BSC and TRON chains.
 * Uses EIP-712 typed structured data signing for payment authentication.
 *
 * Supported chains:
 * - BSC (chainId=56, 18 decimals)
 * - TRON (chainId=728126428, 6 decimals)
 *
 * IMPORTANT: Uses Keccak-256 for hashing, NEVER SHA3-256.
 */

/**
 * PayTheFly webhook body format.
 *
 * @example
 * {
 *   "data": "{\"serial_no\":\"...\",\"value\":\"10.00\",...}",
 *   "sign": "hmac_hex_signature",
 *   "timestamp": 1709312400
 * }
 */
export interface PayTheFlyWebhookBody {
  data: string; // JSON stringified payload
  sign: string; // HMAC-SHA256 hex signature
  timestamp: number; // Unix timestamp
}

/**
 * PayTheFly webhook payload (decoded from data field).
 *
 * Note: Uses 'value' not 'amount', and 'confirmed' not 'status'.
 */
export interface PayTheFlyWebhookPayload {
  value: string; // Payment amount (NOT "amount")
  confirmed: boolean; // Payment confirmed (NOT "status")
  serial_no: string; // Order serial number
  tx_hash: string; // Blockchain transaction hash
  wallet: string; // Payer's wallet address
  tx_type: number; // 1=payment, 2=withdrawal
}

export interface PayTheFlyPaymentUrl {
  url: string;
  serialNo: string;
  deadline: number;
}

@Injectable()
export class PayTheFlyService {
  private readonly logger = new Logger(PayTheFlyService.name);

  public constructor(
    private readonly configurationService: ConfigurationService
  ) {}

  /**
   * Generate a PayTheFly payment URL.
   *
   * Payment link format:
   * https://pro.paythefly.com/pay?chainId=56&projectId=xxx&amount=0.01&serialNo=xxx&deadline=xxx&signature=0x...&token=0x...
   *
   * @param amount Human-readable amount (e.g., "10.00"), NOT raw token units
   * @param serialNo Unique order reference
   * @param tokenAddress Token contract address
   */
  public generatePaymentUrl({
    amount,
    serialNo,
    tokenAddress
  }: {
    amount: string;
    serialNo: string;
    tokenAddress: string;
  }): PayTheFlyPaymentUrl {
    const projectId = this.configurationService.get('PAYTHEFLY_PROJECT_ID');
    const chainId = this.configurationService.get('PAYTHEFLY_CHAIN_ID');
    const deadline = Math.floor(Date.now() / 1000) + 1800; // 30 min

    // Note: The EIP-712 signature must be generated server-side
    // using the private key. The actual signing requires ethers.js
    // or a similar library with EIP-712 support.
    //
    // EIP-712 Domain: { name: 'PayTheFlyPro', version: '1' }
    // PaymentRequest struct: { projectId, token, amount, serialNo, deadline }

    const params = new URLSearchParams({
      chainId: String(chainId),
      projectId,
      amount, // Human-readable, NOT raw units
      serialNo,
      deadline: String(deadline),
      token: tokenAddress
      // signature: '0x...' — Must be appended after EIP-712 signing
    });

    return {
      url: `https://pro.paythefly.com/pay?${params.toString()}`,
      serialNo,
      deadline
    };
  }

  /**
   * Verify a PayTheFly webhook signature.
   *
   * Signature: HMAC-SHA256(data + "." + timestamp, projectKey)
   * Uses timing-safe comparison to prevent timing attacks.
   *
   * @throws Error if signature is invalid
   */
  public verifyWebhookSignature(body: PayTheFlyWebhookBody): void {
    const projectKey = this.configurationService.get('PAYTHEFLY_PROJECT_KEY');

    const message = `${body.data}.${body.timestamp}`;
    const expectedSign = createHmac('sha256', projectKey)
      .update(message)
      .digest('hex');

    const expectedBuffer = Buffer.from(expectedSign, 'utf-8');
    const receivedBuffer = Buffer.from(body.sign, 'utf-8');

    // Timing-safe comparison to prevent timing attacks
    if (
      expectedBuffer.length !== receivedBuffer.length ||
      !timingSafeEqual(expectedBuffer, receivedBuffer)
    ) {
      throw new Error('Invalid PayTheFly webhook signature');
    }
  }

  /**
   * Parse and validate a PayTheFly webhook payload.
   *
   * Webhook payload fields:
   * - value (NOT "amount")
   * - confirmed (NOT "status")
   * - serial_no, tx_hash, wallet, tx_type
   *
   * tx_type: 1=payment, 2=withdrawal
   */
  public parseWebhookPayload(
    body: PayTheFlyWebhookBody
  ): PayTheFlyWebhookPayload {
    this.verifyWebhookSignature(body);

    let payload: PayTheFlyWebhookPayload;

    try {
      payload = JSON.parse(body.data);
    } catch {
      throw new Error('Invalid PayTheFly webhook data JSON');
    }

    // Validate required fields
    if (
      !payload.serial_no ||
      payload.value === undefined ||
      payload.confirmed === undefined ||
      !payload.tx_hash ||
      !payload.wallet ||
      payload.tx_type === undefined
    ) {
      throw new Error(
        'Missing required fields in PayTheFly webhook payload. ' +
          'Expected: serial_no, value, confirmed, tx_hash, wallet, tx_type'
      );
    }

    return payload;
  }

  /**
   * Check if a webhook payload represents a confirmed payment.
   *
   * A payment is confirmed when:
   * - confirmed === true
   * - tx_type === 1 (payment, not withdrawal)
   */
  public isPaymentConfirmed(payload: PayTheFlyWebhookPayload): boolean {
    return payload.confirmed === true && payload.tx_type === 1;
  }
}
