import { IsDate, IsNumber, IsOptional } from 'class-validator';

export class UpdateMarketDataDto {
  @IsDate()
  @IsOptional()
  date?: Date;

  @IsNumber()
  marketPrice: number;
}
