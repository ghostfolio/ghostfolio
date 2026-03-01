import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';

import {
  Body,
  Controller,
  HttpCode,
  HttpException,
  Logger,
  Post,
  Res
} from '@nestjs/common';
import { Response } from 'express';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';

import {
  PayTheFlyService,
  PayTheFlyWebhookBody
} from './paythefly.service';

/**
 * PayTheFly Webhook Controller
 *
 * Handles incoming webhook notifications from PayTheFly.
 *
 * Webhook body format:
 * {
 *   "data": "<json string>",
 *   "sign": "<hmac hex>",
 *   "timestamp": <unix>
 * }
 *
 * IMPORTANT: Response must contain "success" string for PayTheFly
 * to mark the notification as delivered.
 */
@Controller('subscription/paythefly')
export class PayTheFlyController {
  private readonly logger = new Logger(PayTheFlyController.name);

  public constructor(
    private readonly configurationService: ConfigurationService,
    private readonly payTheFlyService: PayTheFlyService
  ) {}

  /**
   * Handle PayTheFly webhook notification.
   *
   * Verifies HMAC-SHA256 signature and processes the payment event.
   * Response MUST contain "success" for PayTheFly to acknowledge delivery.
   */
  @Post('webhook')
  @HttpCode(StatusCodes.OK)
  public async handleWebhook(
    @Body() body: PayTheFlyWebhookBody,
    @Res() response: Response
  ) {
    try {
      const payload = this.payTheFlyService.parseWebhookPayload(body);

      if (this.payTheFlyService.isPaymentConfirmed(payload)) {
        this.logger.log(
          `PayTheFly payment confirmed: serial_no=${payload.serial_no}, ` +
            `value=${payload.value}, tx_hash=${payload.tx_hash}, ` +
            `wallet=${payload.wallet}`
        );

        // TODO: Update subscription status based on serial_no
        // await this.subscriptionService.confirmPayment(payload.serial_no);
      } else if (payload.tx_type === 2) {
        this.logger.log(
          `PayTheFly withdrawal event: serial_no=${payload.serial_no}, ` +
            `tx_hash=${payload.tx_hash}`
        );
      } else {
        this.logger.warn(
          `PayTheFly unconfirmed payment: serial_no=${payload.serial_no}, ` +
            `confirmed=${payload.confirmed}`
        );
      }

      // PayTheFly requires response to contain "success"
      return response.send('success');
    } catch (error) {
      this.logger.error(
        `PayTheFly webhook error: ${error.message}`,
        error.stack
      );

      throw new HttpException(
        getReasonPhrase(StatusCodes.BAD_REQUEST),
        StatusCodes.BAD_REQUEST
      );
    }
  }
}
