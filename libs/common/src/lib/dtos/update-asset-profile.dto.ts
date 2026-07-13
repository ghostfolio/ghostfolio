import { IsCurrencyCode } from '@ghostfolio/common/validators/is-currency-code';

import {
  AssetClass,
  AssetSubClass,
  DataGatheringFrequency,
  DataSource,
  Prisma
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  ValidateNested
} from 'class-validator';

import { CountryDto } from './country.dto';
import { HoldingDto } from './holding.dto';
import { ScraperConfigurationDto } from './scraper-configuration.dto';
import { SectorDto } from './sector.dto';

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
  @Type(() => CountryDto)
  @ValidateNested({ each: true })
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
  @Type(() => HoldingDto)
  @ValidateNested({ each: true })
  holdings?: Prisma.InputJsonArray;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  name?: string;

  @IsObject()
  @IsOptional()
  @Type(() => ScraperConfigurationDto)
  @ValidateNested()
  scraperConfiguration?: Prisma.InputJsonObject;

  @IsArray()
  @IsOptional()
  @Type(() => SectorDto)
  @ValidateNested({ each: true })
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
