import { IsISO8601, IsNumber, IsOptional } from 'class-validator';

export class UpdateMarketDataDto {
  @IsISO8601()
  @IsOptional()
  date?: string;

  @IsNumber()
  marketPrice: number;
}
