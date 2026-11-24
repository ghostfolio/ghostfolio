import { IsString } from 'class-validator';

export class RedeemCouponDto {
  @IsString()
  couponCode: string;
}
