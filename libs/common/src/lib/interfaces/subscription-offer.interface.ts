import { StringValue } from 'ms';

export interface SubscriptionOffer {
  coupon?: number;
  couponId?: string;
  durationExtension?: StringValue;
  price: number;
  priceId: string;
}
