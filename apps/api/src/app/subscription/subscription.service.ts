import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { PropertyService } from '@ghostfolio/api/services/property/property.service';
import {
  DEFAULT_LANGUAGE_CODE,
  PROPERTY_STRIPE_CONFIG,
  SUPPORTED_LANGUAGE_CODES
} from '@ghostfolio/common/config';
import { SubscriptionType } from '@ghostfolio/common/enums';
import { parseDate } from '@ghostfolio/common/helper';
import {
  CreateStripeCheckoutSessionResponse,
  SubscriptionOffer
} from '@ghostfolio/common/interfaces';
import {
  SubscriptionOfferKey,
  UserWithSettings
} from '@ghostfolio/common/types';

import { Injectable, Logger } from '@nestjs/common';
import { Prisma, Subscription } from '@prisma/client';
import { addMilliseconds, isBefore } from 'date-fns';
import ms, { StringValue } from 'ms';
import Stripe from 'stripe';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  private stripe: Stripe;

  public constructor(
    private readonly configurationService: ConfigurationService,
    private readonly prismaService: PrismaService,
    private readonly propertyService: PropertyService
  ) {
    if (this.configurationService.get('ENABLE_FEATURE_SUBSCRIPTION')) {
      this.stripe = new Stripe(
        this.configurationService.get('STRIPE_SECRET_KEY'),
        {
          apiVersion: '2026-06-24.dahlia'
        }
      );
    }
  }

  public async createStripeCheckoutSession({
    couponId,
    priceId,
    user
  }: {
    couponId?: string;
    priceId: string;
    user: UserWithSettings;
  }): Promise<CreateStripeCheckoutSessionResponse> {
    const subscriptionOffers: {
      [offer in SubscriptionOfferKey]: SubscriptionOffer;
    } =
      (await this.propertyService.getByKey<any>(PROPERTY_STRIPE_CONFIG)) ?? {};

    const subscriptionOffer = Object.values(subscriptionOffers).find(
      (subscriptionOffer) => {
        return subscriptionOffer.priceId === priceId;
      }
    );

    const stripeCheckoutSessionCreateParams: Stripe.Checkout.SessionCreateParams =
      {
        cancel_url: `${this.configurationService.get('ROOT_URL')}/${
          user.settings.settings.language
        }/account`,
        client_reference_id: user.id,
        line_items: [
          {
            price: priceId,
            quantity: 1
          }
        ],
        locale: this.getStripeLocale(user.settings?.settings?.language),
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
      stripeCheckoutSessionCreateParams.discounts = [
        {
          coupon: couponId
        }
      ];
    }

    const session = await this.stripe.checkout.sessions.create(
      stripeCheckoutSessionCreateParams
    );

    return {
      sessionUrl: session.url
    };
  }

  public async createSubscription({
    duration = '1 year',
    durationExtension,
    price,
    stripeCheckoutSessionId,
    userId
  }: {
    duration?: StringValue;
    durationExtension?: StringValue;
    price: number;
    stripeCheckoutSessionId?: string;
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
        stripeCheckoutSessionId,
        user: {
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

      if (session.payment_status !== 'paid' || session.status !== 'complete') {
        throw new Error(
          `Stripe Checkout Session '${aCheckoutSessionId}' has not been paid (status=${session.status}, payment_status=${session.payment_status})`
        );
      }

      const subscriptionOffer: SubscriptionOffer = JSON.parse(
        session.metadata.subscriptionOffer ?? '{}'
      );

      const durationExtension = subscriptionOffer?.durationExtension;

      try {
        await this.createSubscription({
          durationExtension,
          price: session.amount_total / 100,
          stripeCheckoutSessionId: session.id,
          userId: session.client_reference_id
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          this.logger.log(
            `Stripe Checkout Session '${session.id}' has already been redeemed`
          );
        } else {
          throw error;
        }
      }

      return session.client_reference_id;
    } catch (error) {
      this.logger.error(error);
    }
  }

  public async getSubscription({
    createdAt,
    subscriptions
  }: {
    createdAt: UserWithSettings['createdAt'];
    subscriptions: Subscription[];
  }): Promise<UserWithSettings['subscription']> {
    if (subscriptions.length > 0) {
      const { expiresAt, price } = subscriptions.reduce((a, b) => {
        return new Date(a.expiresAt) > new Date(b.expiresAt) ? a : b;
      });

      let offerKey: SubscriptionOfferKey = price ? 'renewal' : 'default';

      if (isBefore(createdAt, parseDate('2023-01-01'))) {
        offerKey = 'renewal-early-bird-2023';
      } else if (isBefore(createdAt, parseDate('2024-01-01'))) {
        offerKey = 'renewal-early-bird-2024';
      } else if (isBefore(createdAt, parseDate('2025-12-01'))) {
        offerKey = 'renewal-early-bird-2025';
      }

      const offer = await this.getSubscriptionOffer({
        key: offerKey
      });

      return {
        offer,
        expiresAt: isBefore(new Date(), expiresAt) ? expiresAt : undefined,
        type: isBefore(new Date(), expiresAt)
          ? SubscriptionType.Premium
          : SubscriptionType.Basic
      };
    } else {
      const offer = await this.getSubscriptionOffer({
        key: 'default'
      });

      return {
        offer,
        type: SubscriptionType.Basic
      };
    }
  }

  public async getSubscriptionOffer({
    key
  }: {
    key: SubscriptionOfferKey;
  }): Promise<SubscriptionOffer> {
    if (!this.configurationService.get('ENABLE_FEATURE_SUBSCRIPTION')) {
      return undefined;
    }

    const offers: {
      [offer in SubscriptionOfferKey]: SubscriptionOffer;
    } =
      (await this.propertyService.getByKey<any>(PROPERTY_STRIPE_CONFIG)) ?? {};

    return {
      ...offers[key],
      isRenewal: key.startsWith('renewal')
    };
  }

  private getStripeLocale(
    languageCode: string
  ): Stripe.Checkout.SessionCreateParams.Locale {
    const unsupportedLanguageCodes: Record<
      Exclude<
        (typeof SUPPORTED_LANGUAGE_CODES)[number],
        Stripe.Checkout.SessionCreateParams.Locale
      >,
      true
    > = {
      ca: true,
      uk: true
    };

    if (
      (SUPPORTED_LANGUAGE_CODES as readonly string[]).includes(languageCode) &&
      !(languageCode in unsupportedLanguageCodes)
    ) {
      return languageCode as Stripe.Checkout.SessionCreateParams.Locale;
    }

    return DEFAULT_LANGUAGE_CODE;
  }
}
