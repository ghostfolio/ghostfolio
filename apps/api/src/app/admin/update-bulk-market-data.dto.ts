import { ArrayNotEmpty, IsArray, isNotEmptyObject } from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateMarketDataDto } from './update-market-data.dto';

export class UpdateBulkMarketDataDto {
  @ArrayNotEmpty()
  @IsArray()
  @Type(() => UpdateMarketDataDto)
  marketData: UpdateMarketDataDto[];
}
