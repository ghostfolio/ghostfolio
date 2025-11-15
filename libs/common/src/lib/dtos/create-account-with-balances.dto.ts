import { CreateAccountDto } from '@ghostfolio/common/dtos';
import { AccountBalance } from '@ghostfolio/common/interfaces';

import { IsArray, IsOptional } from 'class-validator';

export class CreateAccountWithBalancesDto extends CreateAccountDto {
  @IsArray()
  @IsOptional()
  balances?: AccountBalance[];
}
