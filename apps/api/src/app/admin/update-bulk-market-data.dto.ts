import { ArrayNotEmpty, IsArray, isNotEmptyObject } from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateMarketDataDto } from './update-market-data.dto';

export class UpdateBulkMarketDataDto {
  @IsArray()
  @ArrayNotEmpty()
  @Type(() => UpdateMarketDataDto)
  marketData: UpdateMarketDataDto[];
}
