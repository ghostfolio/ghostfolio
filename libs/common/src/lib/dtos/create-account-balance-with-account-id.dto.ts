import { IsUUID } from 'class-validator';

import { CreateAccountBalanceDto } from './create-account-balance.dto';

/** @deprecated */
export class CreateAccountBalanceWithAccountIdDto extends CreateAccountBalanceDto {
  @IsUUID()
  accountId: string;
}
