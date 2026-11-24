import { IsOptional, IsString } from 'class-validator';

export class CreateStripeCheckoutSessionDto {
  @IsOptional()
  @IsString()
  couponId?: string;

  @IsString()
  priceId: string;
}
