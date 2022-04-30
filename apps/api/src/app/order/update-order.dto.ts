import { AssetClass, AssetSubClass, DataSource, Type } from '@prisma/client';
import {
  IsEnum,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString
} from 'class-validator';

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

  @IsString()
  currency: string;

  @IsString()
  dataSource: DataSource;

  @IsISO8601()
  date: string;

  @IsNumber()
  fee: number;

  @IsString()
  id: string;

  @IsNumber()
  quantity: number;

  @IsString()
  symbol: string;

  @IsString()
  type: Type;

  @IsNumber()
  unitPrice: number;
}
