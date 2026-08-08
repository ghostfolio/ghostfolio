import { UpdateMarketDataDto } from '@ghostfolio/common/dtos';

import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, ValidateNested } from 'class-validator';

export class UpdateBulkMarketDataDto {
  @ArrayNotEmpty()
  @IsArray()
  @Type(() => UpdateMarketDataDto)
  @ValidateNested({ each: true })
  marketData: UpdateMarketDataDto[];
}
