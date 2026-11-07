import { COMMENT_MAXIMUM_LENGTH } from '@ghostfolio/common/config';
import { IsValidAccountBalanceDateConstraint } from '@ghostfolio/common/validator-constraints/is-valid-account-balance-date';

import { Transform, TransformFnParams } from 'class-transformer';
import {
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Validate
} from 'class-validator';
import { isString } from 'lodash-es';

export class CreateAccountBalanceDto {
  @IsNumber()
  balance: number;

  @IsOptional()
  @IsString()
  @MaxLength(COMMENT_MAXIMUM_LENGTH)
  @Transform(({ value }: TransformFnParams) =>
    isString(value) ? value.trim() : value
  )
  comment?: string | null;

  @IsISO8601()
  @Validate(IsValidAccountBalanceDateConstraint)
  date: string;
}
