import { IsAfter1970Constraint } from '@ghostfolio/common/validator-constraints/is-after-1970';
import { IsCurrencyCode } from '@ghostfolio/common/validators/is-currency-code';

import { AssetClass, AssetSubClass, DataSource, Type } from '@prisma/client';
import { Transform, TransformFnParams } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Validate
} from 'class-validator';
import { isString } from 'lodash';

export class CreateOrderDto {
  @IsOptional()
  @IsString()
  accountId?: string;

  @IsEnum(AssetClass)
  @IsOptional()
  assetClass?: AssetClass;

  @IsEnum(AssetSubClass)
  @IsOptional()
  assetSubClass?: AssetSubClass;

  @IsOptional()
  @IsString()
  @Transform(({ value }: TransformFnParams) =>
    isString(value) ? value.trim() : value
  )
  comment?: string;

  @IsCurrencyCode()
  currency: string;

  @IsCurrencyCode()
  @IsOptional()
  customCurrency?: string;

  @IsEnum(DataSource)
  @IsOptional() // Optional for type FEE, INTEREST, and LIABILITY (default data source is resolved in the backend)
  dataSource?: DataSource;

  @IsISO8601()
  @Validate(IsAfter1970Constraint)
  date: string;

  @IsNumber()
  @Min(0)
  fee: number;

  @IsNumber()
  @Min(0)
  quantity: number;

  @IsString()
  symbol: string;

  @ArrayUnique()
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  tags?: string[];

  @IsEnum(Type)
  type: Type;

  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsBoolean()
  @IsOptional()
  updateAccountBalance?: boolean;
}
