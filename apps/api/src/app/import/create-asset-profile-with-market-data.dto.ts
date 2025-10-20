import { MarketData } from '@ghostfolio/common/interfaces';

import { DataSource } from '@prisma/client';
import { IsArray, IsEnum, IsOptional } from 'class-validator';

import { CreateAssetProfileDto } from '../admin/create-asset-profile.dto';

export class CreateAssetProfileWithMarketDataDto extends CreateAssetProfileDto {
  @IsEnum([DataSource.MANUAL], {
    message: `dataSource must be '${DataSource.MANUAL}'`
  })
  dataSource: DataSource;

  @IsArray()
  @IsOptional()
  marketData?: MarketData[];
}
