import { StringValue } from 'ms';

export interface SubscriptionOffer {
  coupon?: number;
  couponId?: string;
  durationExtension?: StringValue;
  isRenewal?: boolean;
  label?: string;
  price: number;
  priceId: string;
}
