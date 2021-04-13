import { Currency, Type } from '@prisma/client';
import { IsISO8601, IsNumber, IsString, ValidateIf } from 'class-validator';

export class CreateOrderDto {
  @IsString()
  currency: Currency;

  @IsISO8601()
  date: string;

  @IsNumber()
  quantity: number;

  @IsString()
  symbol: string;

  @IsString()
  type: Type;

  @IsNumber()
  unitPrice: number;
}
