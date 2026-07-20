import { MarketData } from '@ghostfolio/common/interfaces';

import { DataSource } from '@prisma/client';
import { IsArray, IsIn, IsOptional } from 'class-validator';

import { CreateAssetProfileDto } from './create-asset-profile.dto';

export class CreateAssetProfileWithMarketDataDto extends CreateAssetProfileDto {
  @IsIn([DataSource.MANUAL], {
    message: `dataSource must be '${DataSource.MANUAL}'`
  })
  override dataSource: DataSource;

  @IsArray()
  @IsOptional()
  marketData?: MarketData[];
}
