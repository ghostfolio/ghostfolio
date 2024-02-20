import {
  AssetClass,
  AssetSubClass,
  DataSource,
  Tag,
  Type
} from '@prisma/client';
import { Transform, TransformFnParams } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsISO4217CurrencyCode,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  Min
} from 'class-validator';
import { isString } from 'lodash';

export class UpdateOrderDto {
  @IsOptional()
  @IsString()
  accountId?: string;

  @IsEnum(AssetClass, { each: true })
  @IsOptional()
  assetClass?: AssetClass;

  @IsEnum(AssetSubClass, { each: true })
  @IsOptional()
  assetSubClass?: AssetSubClass;

  @IsOptional()
  @IsString()
  @Transform(({ value }: TransformFnParams) =>
    isString(value) ? value.trim() : value
  )
  comment?: string;

  @IsISO4217CurrencyCode()
  currency: string;

  @IsString()
  dataSource: DataSource;

  @IsISO8601()
  date: string;

  @IsNumber()
  @Min(0)
  fee: number;

  @IsString()
  id: string;

  @IsNumber()
  @Min(0)
  quantity: number;

  @IsString()
  symbol: string;

  @IsArray()
  @IsOptional()
  tags?: Tag[];

  @IsString()
  type: Type;

  @IsNumber()
  @Min(0)
  unitPrice: number;
}
