import { IsCurrencyCode } from '@ghostfolio/api/validators/is-currency-code';

import {
  AssetClass,
  AssetSubClass,
  DataSource,
  Prisma,
  Tag
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
  @IsEnum(AssetClass, { each: true })
  @IsOptional()
  assetClass?: AssetClass;

  @IsEnum(AssetSubClass, { each: true })
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

  @IsEnum(DataSource)
  @IsOptional()
  dataSource?: DataSource;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  name?: string;

  @IsArray()
  @IsOptional()
  tags?: Tag[];

  @IsArray()
  @IsOptional()
  tagsDisconnected?: Tag[];

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
    protocols: ['https'],
    require_protocol: true
  })
  url?: string;
}
