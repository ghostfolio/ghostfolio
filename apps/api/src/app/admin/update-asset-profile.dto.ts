import { AssetClass, AssetSubClass, Prisma } from '@prisma/client';
import {
  IsArray,
  IsEnum,
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

  @IsArray()
  @IsOptional()
  countries?: Prisma.InputJsonArray;

  @IsString()
  @IsOptional()
  comment?: string;

  @IsString()
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
