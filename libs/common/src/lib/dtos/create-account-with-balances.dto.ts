import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsOptional,
  ValidateNested
} from 'class-validator';

import { AccountBalanceDto } from './account-balance.dto';
import { CreateAccountDto } from './create-account.dto';

export class CreateAccountWithBalancesDto extends CreateAccountDto {
  @IsArray()
  @IsOptional()
  @Type(() => AccountBalanceDto)
  @ValidateNested({ each: true })
  balances?: AccountBalanceDto[];

  /**
   * @deprecated Accepted for backward compatibility with old export files
   * and mapped to the "Exclude from Analysis" tag (`TAG_ID_EXCLUDE_FROM_ANALYSIS`)
   */
  @IsBoolean()
  @IsOptional()
  isExcluded?: boolean;
}
