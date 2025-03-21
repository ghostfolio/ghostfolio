import { CreateOrderDto } from '@ghostfolio/api/app/order/create-order.dto';

import { Type } from 'class-transformer';
import { IsArray, IsOptional, ValidateNested } from 'class-validator';

import { CreateAccountWithBalancesDto } from './create-account-with-balances.dto';

export class ImportDataDto {
  @IsOptional()
  @IsArray()
  @Type(() => CreateAccountWithBalancesDto)
  @ValidateNested({ each: true })
  accounts: CreateAccountWithBalancesDto[];

  @IsArray()
  @Type(() => CreateOrderDto)
  @ValidateNested({ each: true })
  activities: CreateOrderDto[];
}
