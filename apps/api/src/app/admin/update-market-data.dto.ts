import { IsNumber } from 'class-validator';

export class UpdateMarketDataDto {
  @IsNumber()
  marketPrice: number;
}
