import {
  CreateAccountWithBalancesDto,
  CreateAssetProfileWithMarketDataDto,
  CreateOrderDto,
  CreateTagDto
} from '@ghostfolio/common/dtos';

import { Type } from 'class-transformer';
import { IsArray, IsOptional, ValidateNested } from 'class-validator';

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
