import { DataSource, Type } from '@prisma/client';
import { IsISO8601, IsNumber, IsString } from 'class-validator';

export class UpdateOrderDto {
  @IsString()
  accountId: string;

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
