import {
  CreateAccountWithBalancesDto,
  CreateAssetProfileWithMarketDataDto,
  CreateOrderDto,
  CreatePlatformDto,
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
  @Type(() => CreatePlatformDto)
  @ValidateNested({ each: true })
  platforms?: CreatePlatformDto[];

  @IsArray()
  @IsOptional()
  @Type(() => CreateTagDto)
  @ValidateNested({ each: true })
  tags?: CreateTagDto[];
}
