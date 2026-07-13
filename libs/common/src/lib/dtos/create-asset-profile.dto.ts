import { IsCurrencyCode } from '@ghostfolio/common/validators/is-currency-code';

import { AssetClass, AssetSubClass, DataSource, Prisma } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  ValidateNested
} from 'class-validator';

import { CountryDto } from './country.dto';
import { HoldingDto } from './holding.dto';
import { SectorDto } from './sector.dto';

export class CreateAssetProfileDto {
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
  @Type(() => CountryDto)
  @ValidateNested({ each: true })
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
  @Type(() => HoldingDto)
  @ValidateNested({ each: true })
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

  @IsArray()
  @IsOptional()
  @Type(() => SectorDto)
  @ValidateNested({ each: true })
  sectors?: Prisma.InputJsonArray;

  @IsString()
  symbol: string;

  @IsOptional()
  @IsUrl({
    protocols: ['http', 'https'],
    require_protocol: true
  })
  url?: string;
}
