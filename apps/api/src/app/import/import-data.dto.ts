import { CreateOrderDto } from '@ghostfolio/api/app/order/create-order.dto';
import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';

export class ImportDataDto {
  @IsArray()
  @Type(() => CreateOrderDto)
  @ValidateNested({ each: true })
  activities: CreateOrderDto[];
}
