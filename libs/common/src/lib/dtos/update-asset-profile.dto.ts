import { IsCurrencyCode } from '@ghostfolio/common/validators/is-currency-code';

import {
  AssetClass,
  AssetSubClass,
  DataGatheringFrequency,
  DataSource,
  Prisma
} from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUrl
} from 'class-validator';

export class UpdateAssetProfileDto {
  @IsEnum(AssetClass)
  @IsOptional()
  assetClass?: AssetClass;

  @IsEnum(AssetSubClass)
  @IsOptional()
  assetSubClass?: AssetSubClass;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsArray()
  @IsOptional()
  countries?: Prisma.InputJsonArray;

  @IsCurrencyCode()
  @IsOptional()
  currency?: string;

  @IsEnum(DataGatheringFrequency)
  @IsOptional()
  dataGatheringFrequency?: DataGatheringFrequency;

  @IsEnum(DataSource)
  @IsOptional()
  dataSource?: DataSource;

  @IsArray()
  @IsOptional()
  holdings?: Prisma.InputJsonArray;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  name?: string;

  @IsObject()
  @IsOptional()
  scraperConfiguration?: Prisma.InputJsonObject;

  @IsArray()
  @IsOptional()
  sectors?: Prisma.InputJsonArray;

  @IsOptional()
  @IsString()
  symbol?: string;

  @IsObject()
  @IsOptional()
  symbolMapping?: {
    [dataProvider: string]: string;
  };

  @IsOptional()
  @IsUrl({
    protocols: ['http', 'https'],
    require_protocol: true
  })
  url?: string;
}
