import { IsCurrencyCode } from '@ghostfolio/common/validators/is-currency-code';

import { AssetClass, AssetSubClass, DataSource, Prisma } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUrl
} from 'class-validator';

export class CreateAssetProfileDto {
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
  currency: string;

  @IsOptional()
  @IsString()
  cusip?: string;

  @IsEnum(DataSource)
  dataSource: DataSource;

  @IsOptional()
  @IsString()
  figi?: string;

  @IsOptional()
  @IsString()
  figiComposite?: string;

  @IsOptional()
  @IsString()
  figiShareClass?: string;

  @IsArray()
  @IsOptional()
  holdings?: Prisma.InputJsonArray;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  isin?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsObject()
  @IsOptional()
  scraperConfiguration?: Prisma.InputJsonObject;

  @IsArray()
  @IsOptional()
  sectors?: Prisma.InputJsonArray;

  @IsString()
  symbol: string;

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
