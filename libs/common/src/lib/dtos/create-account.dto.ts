import { COMMENT_MAXIMUM_LENGTH } from '@ghostfolio/common/config';
import { IsCurrencyCode } from '@ghostfolio/common/validators/is-currency-code';

import { Transform, TransformFnParams } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf
} from 'class-validator';
import { isString } from 'lodash';

export class CreateAccountDto {
  /**
   * The initial balance, stored as the account balance of today.
   * Optional because callers may instead supply the full history via `balances`.
   */
  @IsNumber()
  @IsOptional()
  balance?: number;

  @IsOptional()
  @IsString()
  @MaxLength(COMMENT_MAXIMUM_LENGTH)
  @Transform(({ value }: TransformFnParams) =>
    isString(value) ? value.trim() : value
  )
  comment?: string | null;

  @IsCurrencyCode()
  currency: string;

  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  name: string;

  @IsString()
  @ValidateIf((_object, value) => value !== null)
  platformId: string | null;

  @ArrayUnique()
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  tags?: string[];
}
