import { Type } from '@prisma/client';
import { IsISO8601, IsNumber, IsString } from 'class-validator';

export class CreateOrderDto {
  @IsString()
  currency: string;

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
