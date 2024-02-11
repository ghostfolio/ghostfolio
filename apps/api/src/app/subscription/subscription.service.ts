import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { DEFAULT_LANGUAGE_CODE } from '@ghostfolio/common/config';
import { parseDate } from '@ghostfolio/common/helper';
import { SubscriptionOffer, UserWithSettings } from '@ghostfolio/common/types';
import { SubscriptionType } from '@ghostfolio/common/types/subscription-type.type';

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
      const session =
        await this.stripe.checkout.sessions.retrieve(aCheckoutSessionId);

      await this.createSubscription({
        price: session.amount_total / 100,
        userId: session.client_reference_id
      });

      return session.client_reference_id;
    } catch (error) {
      Logger.error(error, 'SubscriptionService');
    }
  }

  public getSubscription({
    createdAt,
    subscriptions
  }: {
    createdAt: UserWithSettings['createdAt'];
    subscriptions: Subscription[];
  }): UserWithSettings['subscription'] {
    if (subscriptions.length > 0) {
      const { expiresAt, price } = subscriptions.reduce((a, b) => {
        return new Date(a.expiresAt) > new Date(b.expiresAt) ? a : b;
      });

      let offer: SubscriptionOffer = price ? 'renewal' : 'default';

      if (isBefore(createdAt, parseDate('2023-01-01'))) {
        offer = 'renewal-early-bird';
      }

      return {
        expiresAt,
        offer,
        type: isBefore(new Date(), expiresAt)
          ? SubscriptionType.Premium
          : SubscriptionType.Basic
      };
    } else {
      return {
        offer: 'default',
        type: SubscriptionType.Basic
      };
    }
  }
}
