import { ConfigurationService } from '@ghostfolio/api/services/configuration.service';
import type { RequestWithUser } from '@ghostfolio/common/types';
import {
  Body,
  Controller,
  Get,
  HttpException,
  Inject,
  Post,
  Req,
  Res,
  UseGuards
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';

import { SubscriptionService } from './subscription.service';

@Controller('subscription')
export class SubscriptionController {
  public constructor(
    private readonly configurationService: ConfigurationService,
    @Inject(REQUEST) private readonly request: RequestWithUser,
    private readonly subscriptionService: SubscriptionService
  ) {}

  @Get('stripe/callback')
  public async stripeCallback(@Req() req, @Res() res) {
    await this.subscriptionService.createSubscription(
      req.query.checkoutSessionId
    );

    res.redirect(`${this.configurationService.get('ROOT_URL')}/account`);
  }

  @Post('stripe/checkout-session')
  @UseGuards(AuthGuard('jwt'))
  public async createCheckoutSession(
    @Body() { couponId, priceId }: { couponId: string; priceId: string }
  ) {
    try {
      return await this.subscriptionService.createCheckoutSession({
        couponId,
        priceId,
        userId: this.request.user.id
      });
    } catch (error) {
      console.error(error);

      throw new HttpException(
        getReasonPhrase(StatusCodes.BAD_REQUEST),
        StatusCodes.BAD_REQUEST
      );
    }
  }
}
