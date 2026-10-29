import { StringValue } from 'ms';

export interface Coupon {
  code: string;
  createdAt: string;
  duration: StringValue;
}
