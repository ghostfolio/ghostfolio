import { ConfigurationService } from '@ghostfolio/api/services/configuration.service';
import { PrismaService } from '@ghostfolio/api/services/prisma.service';
import {
  DEFAULT_LANGUAGE_CODE,
  PROPERTY_STRIPE_CONFIG
} from '@ghostfolio/common/config';
import { UserWithSettings } from '@ghostfolio/common/interfaces';
import { Subscription as SubscriptionInterface } from '@ghostfolio/common/interfaces/subscription.interface';
import { SubscriptionType } from '@ghostfolio/common/types/subscription.type';
import { Injectable, Logger } from '@nestjs/common';
import { Subscription } from '@prisma/client';
import { addMilliseconds, isBefore } from 'date-fns';
import ms, { StringValue } from 'ms';
import Stripe from 'stripe';

@Injectable()
export class SubscriptionService {
  private stripe: Stripe;

  public constructor(
    private readonly configurationService: ConfigurationService,
    private readonly prismaService: PrismaService
  ) {
    this.stripe = new Stripe(
      this.configurationService.get('STRIPE_SECRET_KEY'),
      {
        apiVersion: '2022-11-15'
      }
    );
  }

  public async createCheckoutSession({
    couponId,
    priceId,
    user
  }: {
    couponId?: string;
    priceId: string;
    user: UserWithSettings;
  }) {
    const checkoutSessionCreateParams: Stripe.Checkout.SessionCreateParams = {
      cancel_url: `${this.configurationService.get('ROOT_URL')}/${
        user.Settings?.settings?.language ?? DEFAULT_LANGUAGE_CODE
      }/account`,
      client_reference_id: user.id,
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      mode: 'payment',
      payment_method_types: ['card'],
      success_url: `${this.configurationService.get(
        'ROOT_URL'
      )}/api/v1/subscription/stripe/callback?checkoutSessionId={CHECKOUT_SESSION_ID}`
    };

    if (couponId) {
      checkoutSessionCreateParams.discounts = [
        {
          coupon: couponId
        }
      ];
    }

    const session = await this.stripe.checkout.sessions.create(
      checkoutSessionCreateParams
    );

    return {
      sessionId: session.id
    };
  }

  public async createSubscription({
    duration = '1 year',
    price,
    userId
  }: {
    duration?: StringValue;
    price: number;
    userId: string;
  }) {
    await this.prismaService.subscription.create({
      data: {
        price,
        expiresAt: addMilliseconds(new Date(), ms(duration)),
        User: {
          connect: {
            id: userId
          }
        }
      }
    });
  }

  public async createSubscriptionViaStripe(aCheckoutSessionId: string) {
    try {
      const session = await this.stripe.checkout.sessions.retrieve(
        aCheckoutSessionId
      );

      let subscriptions: SubscriptionInterface[] = [];

      const stripeConfig = (await this.prismaService.property.findUnique({
        where: { key: PROPERTY_STRIPE_CONFIG }
      })) ?? { value: '{}' };

      subscriptions = [JSON.parse(stripeConfig.value)];

      const coupon = subscriptions[0]?.coupon ?? 0;
      const price = subscriptions[0]?.price ?? 0;

      await this.createSubscription({
        price: price - coupon,
        userId: session.client_reference_id
      });

      return session.client_reference_id;
    } catch (error) {
      Logger.error(error, 'SubscriptionService');
    }
  }

  public getSubscription(aSubscriptions: Subscription[]) {
    if (aSubscriptions.length > 0) {
      const latestSubscription = aSubscriptions.reduce((a, b) => {
        return new Date(a.expiresAt) > new Date(b.expiresAt) ? a : b;
      });

      return {
        expiresAt: latestSubscription.expiresAt,
        type: isBefore(new Date(), latestSubscription.expiresAt)
          ? SubscriptionType.Premium
          : SubscriptionType.Basic
      };
    } else {
      return {
        type: SubscriptionType.Basic
      };
    }
  }
}
