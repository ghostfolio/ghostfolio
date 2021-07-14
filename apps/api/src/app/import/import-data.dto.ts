import { Order } from '@prisma/client';
import { IsArray } from 'class-validator';

export class ImportDataDto {
  @IsArray()
  orders: Partial<Order>[];
}
