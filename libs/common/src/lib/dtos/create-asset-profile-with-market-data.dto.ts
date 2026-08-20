import { DataSource } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsArray, IsIn, IsOptional, ValidateNested } from 'class-validator';

import { CreateAssetProfileDto } from './create-asset-profile.dto';
import { MarketDataDto } from './market-data.dto';

export class CreateAssetProfileWithMarketDataDto extends CreateAssetProfileDto {
  @IsIn([DataSource.MANUAL], {
    message: `dataSource must be '${DataSource.MANUAL}'`
  })
  override dataSource: DataSource;

  @IsArray()
  @IsOptional()
  @Type(() => MarketDataDto)
  @ValidateNested({ each: true })
  marketData?: MarketDataDto[];
}
