import { Currency, DataSource, Type } from '@prisma/client';
import { IsISO8601, IsNumber, IsString, ValidateIf } from 'class-validator';

export class UpdateAccountDto {
  @IsString()
  accountId: string;

  @IsString()
  currency: Currency;

  @IsString()
  dataSource: DataSource;

  @IsISO8601()
  date: string;

  @IsNumber()
  fee: number;

  @IsString()
  @ValidateIf((object, value) => value !== null)
  platformId: string | null;

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
