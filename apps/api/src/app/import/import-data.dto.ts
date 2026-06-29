import {
  CreateAccountWithBalancesDto,
  CreateAssetProfileWithMarketDataDto,
  CreateOrderDto,
  CreateTagDto
} from '@ghostfolio/common/dtos';

import { Type } from 'class-transformer';
import {
  IsArray,
  IsOptional,
  ValidateNested,
  IsString,
  IsUrl
} from 'class-validator';

export class ImportPlatformDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  name: string;

  @IsUrl({
    protocols: ['http', 'https'],
    require_protocol: true
  })
  url: string;
}

export class ImportDataDto {
  @IsArray()
  @IsOptional()
  @Type(() => ImportPlatformDto)
  @ValidateNested({ each: true })
  platforms?: ImportPlatformDto[];

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
