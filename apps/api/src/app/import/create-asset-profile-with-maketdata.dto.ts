import { MarketData } from '@ghostfolio/common/interfaces';

import { IsArray, IsOptional } from 'class-validator';

import { CreateAssetProfileDto } from '../admin/create-asset-profile.dto';

export class CreateAssetProfileWithMarketDataDto extends CreateAssetProfileDto {
  @IsArray()
  @IsOptional()
  marketData?: MarketData[];
}
