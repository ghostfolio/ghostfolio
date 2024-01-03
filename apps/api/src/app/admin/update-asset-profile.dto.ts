import { AssetClass, AssetSubClass, Prisma, Tag } from '@prisma/client';
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

  @IsString()
  @IsOptional()
  comment?: string;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsArray()
  @IsOptional()
  tags?: Tag[];

  @IsObject()
  @IsOptional()
  scraperConfiguration?: Prisma.InputJsonObject;

  @IsObject()
  @IsOptional()
  symbolMapping?: {
    [dataProvider: string]: string;
  };
}
