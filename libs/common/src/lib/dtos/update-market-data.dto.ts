import { IsISO8601, IsNumber } from 'class-validator';

export class UpdateMarketDataDto {
  @IsISO8601()
  date: string;

  @IsNumber()
  marketPrice: number;
}
