import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { PropertyService } from '@ghostfolio/api/services/property/property.service';
import {
  DEFAULT_LANGUAGE_CODE,
  PROPERTY_STRIPE_CONFIG
} from '@ghostfolio/common/config';
import { parseDate } from '@ghostfolio/common/helper';
import { SubscriptionOffer } from '@ghostfolio/common/interfaces';
import {
  SubscriptionOfferKey,
  UserWithSettings
} from '@ghostfolio/common/types';
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
    private readonly prismaService: PrismaService,
    private readonly propertyService: PropertyService
  ) {
    this.stripe = new Stripe(
      this.configurationService.get('STRIPE_SECRET_KEY'),
      {
        apiVersion: '2024-04-10'
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
    const subscriptionOffers: {
      [offer in SubscriptionOfferKey]: SubscriptionOffer;
    } =
      ((await this.propertyService.getByKey(PROPERTY_STRIPE_CONFIG)) as any) ??
      {};

    const subscriptionOffer = Object.values(subscriptionOffers).find(
      (subscriptionOffer) => {
        return subscriptionOffer.priceId === priceId;
      }
    );

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
      locale:
        (user.Settings?.settings
          ?.language as Stripe.Checkout.SessionCreateParams.Locale) ??
        DEFAULT_LANGUAGE_CODE,
      metadata: subscriptionOffer
        ? { subscriptionOffer: JSON.stringify(subscriptionOffer) }
        : {},
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
    durationExtension,
    price,
    userId
  }: {
    duration?: StringValue;
    durationExtension?: StringValue;
    price: number;
    userId: string;
  }) {
    let expiresAt = addMilliseconds(new Date(), ms(duration));

    if (durationExtension) {
      expiresAt = addMilliseconds(expiresAt, ms(durationExtension));
    }

    await this.prismaService.subscription.create({
      data: {
        expiresAt,
        price,
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
      let durationExtension: StringValue;

      const session =
        await this.stripe.checkout.sessions.retrieve(aCheckoutSessionId);

      const subscriptionOffer: SubscriptionOffer = JSON.parse(
        session.metadata.subscriptionOffer ?? '{}'
      );

      if (subscriptionOffer) {
        durationExtension = subscriptionOffer.durationExtension;
      }

      await this.createSubscription({
        durationExtension,
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

      let offer: SubscriptionOfferKey = price ? 'renewal' : 'default';

      if (isBefore(createdAt, parseDate('2023-01-01'))) {
        offer = 'renewal-early-bird-2023';
      } else if (isBefore(createdAt, parseDate('2024-01-01'))) {
        offer = 'renewal-early-bird-2024';
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
