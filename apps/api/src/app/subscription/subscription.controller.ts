import { ConfigurationService } from '@ghostfolio/api/services/configuration.service';
import { PropertyService } from '@ghostfolio/api/services/property/property.service';
import { PROPERTY_COUPONS } from '@ghostfolio/common/config';
import { Coupon } from '@ghostfolio/common/interfaces';
import type { RequestWithUser } from '@ghostfolio/common/types';
import {
  Body,
  Controller,
  Get,
  HttpException,
  Inject,
  Logger,
  Post,
  Req,
  Res,
  UseGuards
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';

import { SubscriptionService } from './subscription.service';

@Controller('subscription')
export class SubscriptionController {
  public constructor(
    private readonly configurationService: ConfigurationService,
    private readonly propertyService: PropertyService,
    @Inject(REQUEST) private readonly request: RequestWithUser,
    private readonly subscriptionService: SubscriptionService
  ) {}

  @Post('redeem-coupon')
  @UseGuards(AuthGuard('jwt'))
  public async redeemCoupon(
    @Body() { couponCode }: { couponCode: string },
    @Res() res: Response
  ) {
    if (!this.request.user) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    let coupons =
      ((await this.propertyService.getByKey(PROPERTY_COUPONS)) as Coupon[]) ??
      [];

    const isValid = coupons.some((coupon) => {
      return coupon.code === couponCode;
    });

    if (!isValid) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.BAD_REQUEST),
        StatusCodes.BAD_REQUEST
      );
    }

    await this.subscriptionService.createSubscription(this.request.user.id);

    // Destroy coupon
    coupons = coupons.filter((coupon) => {
      return coupon.code !== couponCode;
    });
    await this.propertyService.put({
      key: PROPERTY_COUPONS,
      value: JSON.stringify(coupons)
    });

    Logger.log(
      `Subscription for user '${this.request.user.id}' has been created with coupon`
    );

    res.status(StatusCodes.OK);

    return <any>res.json({
      message: getReasonPhrase(StatusCodes.OK),
      statusCode: StatusCodes.OK
    });
  }

  @Get('stripe/callback')
  public async stripeCallback(@Req() req, @Res() res) {
    const userId = await this.subscriptionService.createSubscriptionViaStripe(
      req.query.checkoutSessionId
    );

    Logger.log(`Subscription for user '${userId}' has been created via Stripe`);

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
      Logger.error(error);

      throw new HttpException(
        getReasonPhrase(StatusCodes.BAD_REQUEST),
        StatusCodes.BAD_REQUEST
      );
    }
  }
}
