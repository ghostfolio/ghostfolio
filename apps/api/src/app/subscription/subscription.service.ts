import { ConfigurationService } from '@ghostfolio/api/services/configuration.service';
import { PrismaService } from '@ghostfolio/api/services/prisma.service';
import { Injectable } from '@nestjs/common';
import { addDays } from 'date-fns';
import Stripe from 'stripe';

@Injectable()
export class SubscriptionService {
  private stripe: Stripe;

  public constructor(
    private readonly configurationService: ConfigurationService,
    private prisma: PrismaService
  ) {
    this.stripe = new Stripe(
      this.configurationService.get('STRIPE_SECRET_KEY'),
      {
        apiVersion: '2020-08-27'
      }
    );
  }

  public async createCheckoutSession({
    couponId,
    priceId,
    userId
  }: {
    couponId?: string;
    priceId: string;
    userId: string;
  }) {
    const checkoutSessionCreateParams: Stripe.Checkout.SessionCreateParams = {
      cancel_url: `${this.configurationService.get('ROOT_URL')}/account`,
      client_reference_id: userId,
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
      )}/api/subscription/stripe/callback?checkoutSessionId={CHECKOUT_SESSION_ID}`
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

  public async createSubscription(aCheckoutSessionId: string) {
    try {
      const session = await this.stripe.checkout.sessions.retrieve(
        aCheckoutSessionId
      );

      await this.prisma.subscription.create({
        data: {
          expiresAt: addDays(new Date(), 365),
          User: {
            connect: {
              id: session.client_reference_id
            }
          }
        }
      });

      await this.stripe.customers.update(session.customer as string, {
        description: session.client_reference_id
      });
    } catch (error) {
      console.error(error);
    }
  }
}
