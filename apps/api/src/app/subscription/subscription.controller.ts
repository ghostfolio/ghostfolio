import { HasPermissionGuard } from '@ghostfolio/api/guards/has-permission.guard';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { PropertyService } from '@ghostfolio/api/services/property/property.service';
import {
  DEFAULT_LANGUAGE_CODE,
  PROPERTY_COUPONS
} from '@ghostfolio/common/config';
import {
  Coupon,
  CreateStripeCheckoutSessionResponse
} from '@ghostfolio/common/interfaces';
import type { RequestWithUser } from '@ghostfolio/common/types';

import {
  Body,
  Controller,
  Get,
  HttpCode,
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
import { Request, Response } from 'express';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';

import { SubscriptionService } from './subscription.service';

@Controller('subscription')
export class SubscriptionController {
  private readonly logger = new Logger(SubscriptionController.name);

  public constructor(
    private readonly configurationService: ConfigurationService,
    private readonly propertyService: PropertyService,
    @Inject(REQUEST) private readonly request: RequestWithUser,
    private readonly subscriptionService: SubscriptionService
  ) {}

  @Post('redeem-coupon')
  @HttpCode(StatusCodes.OK)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async redeemCoupon(@Body() { couponCode }: { couponCode: string }) {
    if (!this.request.user) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    let coupons =
      (await this.propertyService.getByKey<Coupon[]>(PROPERTY_COUPONS)) ?? [];

    const coupon = coupons.find((currentCoupon) => {
      return currentCoupon.code === couponCode;
    });

    if (coupon === undefined) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.BAD_REQUEST),
        StatusCodes.BAD_REQUEST
      );
    }

    await this.subscriptionService.createSubscription({
      duration: coupon.duration,
      price: 0,
      userId: this.request.user.id
    });

    // Destroy coupon
    coupons = coupons.filter((currentCoupon) => {
      return currentCoupon.code !== couponCode;
    });
    await this.propertyService.put({
      key: PROPERTY_COUPONS,
      value: JSON.stringify(coupons)
    });

    this.logger.log(
      `Subscription for user '${this.request.user.id}' has been created with a coupon for ${coupon.duration}`
    );

    return {
      message: getReasonPhrase(StatusCodes.OK),
      statusCode: StatusCodes.OK
    };
  }

  @Get('stripe/callback')
  public async stripeCallback(
    @Req() request: Request,
    @Res() response: Response
  ) {
    const userId = await this.subscriptionService.createSubscriptionViaStripe(
      request.query.checkoutSessionId as string
    );

    if (userId) {
      this.logger.log(
        `Subscription for user '${userId}' has been created via Stripe`
      );
    }

    response.redirect(
      `${this.configurationService.get(
        'ROOT_URL'
      )}/${DEFAULT_LANGUAGE_CODE}/account/membership`
    );
  }

  @Post('stripe/checkout-session')
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async createStripeCheckoutSession(
    @Body() { couponId, priceId }: { couponId?: string; priceId: string }
  ): Promise<CreateStripeCheckoutSessionResponse> {
    try {
      return await this.subscriptionService.createStripeCheckoutSession({
        couponId,
        priceId,
        user: this.request.user
      });
    } catch (error) {
      this.logger.error(error);

      throw new HttpException(
        getReasonPhrase(StatusCodes.BAD_REQUEST),
        StatusCodes.BAD_REQUEST
      );
    }
  }
}
