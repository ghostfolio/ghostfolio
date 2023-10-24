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
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min
} from 'class-validator';
import { isString } from 'lodash';

export class CreateOrderDto {
  @IsOptional()
  @IsString()
  accountId?: string;

  @IsOptional()
  @IsEnum(AssetClass, { each: true })
  assetClass?: AssetClass;

  @IsOptional()
  @IsEnum(AssetSubClass, { each: true })
  assetSubClass?: AssetSubClass;

  @IsOptional()
  @IsString()
  @Transform(({ value }: TransformFnParams) =>
    isString(value) ? value.trim() : value
  )
  comment?: string;

  @IsString()
  currency: string;

  @IsOptional()
  @IsEnum(DataSource, { each: true })
  dataSource?: DataSource;

  @IsISO8601()
  date: string;

  @IsNumber()
  @Min(0)
  fee: number;

  @IsNumber()
  @IsPositive()
  quantity: number;

  @IsString()
  symbol: string;

  @IsArray()
  @IsOptional()
  tags?: Tag[];

  @IsEnum(Type, { each: true })
  type: Type;

  @IsNumber()
  @IsPositive()
  unitPrice: number;

  @IsBoolean()
  @IsOptional()
  updateAccountBalance?: boolean;
}
