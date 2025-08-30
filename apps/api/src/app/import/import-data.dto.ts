import { CreateOrderDto } from '@ghostfolio/api/app/order/create-order.dto';

import { Type } from 'class-transformer';
import { IsArray, IsOptional, ValidateNested } from 'class-validator';

import { CreateTagDto } from '../endpoints/tags/create-tag.dto';
import { CreateAccountWithBalancesDto } from './create-account-with-balances.dto';
import { CreateAssetProfileWithMarketDataDto } from './create-asset-profile-with-market-data.dto';

export class ImportDataDto {
  @IsArray()
  @IsOptional()
  @Type(() => CreateAccountWithBalancesDto)
  @ValidateNested({ each: true })
  accounts?: CreateAccountWithBalancesDto[];

  @IsArray()
  @Type(() => CreateOrderDto)
  @ValidateNested({ each: true })
  activities: CreateOrderDto[];

  @IsArray()
  @IsOptional()
  @Type(() => CreateAssetProfileWithMarketDataDto)
  @ValidateNested({ each: true })
  assetProfiles?: CreateAssetProfileWithMarketDataDto[];

  @IsArray()
  @IsOptional()
  @Type(() => CreateTagDto)
  @ValidateNested({ each: true })
  tags?: CreateTagDto[];
}
