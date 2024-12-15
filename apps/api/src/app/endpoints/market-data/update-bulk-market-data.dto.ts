import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsISO8601,
  IsNumber,
  IsOptional
} from 'class-validator';

export class UpdateBulkMarketDataDto {
  @ArrayNotEmpty()
  @IsArray()
  @Type(() => UpdateMarketDataDto)
  marketData: UpdateMarketDataDto[];
}

class UpdateMarketDataDto {
  @IsISO8601()
  @IsOptional()
  date?: string;

  @IsNumber()
  marketPrice: number;
}
