import { AssetClass, AssetSubClass, Prisma } from '@prisma/client';
import {
  IsArray,
  IsEnum,
  IsISO4217CurrencyCode,
  IsObject,
  IsOptional,
  IsString
} from 'class-validator';

export class UpdateAssetProfileDto {
  @IsEnum(AssetClass, { each: true })
  @IsOptional()
  assetClass?: AssetClass;

  @IsEnum(AssetSubClass, { each: true })
  @IsOptional()
  assetSubClass?: AssetSubClass;

  @IsString()
  @IsOptional()
  comment?: string;

  @IsArray()
  @IsOptional()
  countries?: Prisma.InputJsonArray;

  @IsISO4217CurrencyCode()
  @IsOptional()
  currency?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsObject()
  @IsOptional()
  scraperConfiguration?: Prisma.InputJsonObject;

  @IsArray()
  @IsOptional()
  sectors?: Prisma.InputJsonArray;

  @IsObject()
  @IsOptional()
  symbolMapping?: {
    [dataProvider: string]: string;
  };
}
