import { AccountBalance } from '@ghostfolio/common/interfaces';

import { IsArray, IsOptional } from 'class-validator';

import { CreateAccountDto } from './create-account.dto';

export class CreateAccountWithBalancesDto extends CreateAccountDto {
  @IsArray()
  @IsOptional()
  balances?: AccountBalance[];
}
