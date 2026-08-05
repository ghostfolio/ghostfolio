import { IsCurrencyCode } from '@ghostfolio/common/validators/is-currency-code';

import { Transform, TransformFnParams } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  ValidateIf
} from 'class-validator';
import { isString } from 'lodash';

export class CreateAccountDto {
  /**
   * The initial balance, stored as the account balance of today.
   * Optional because the balance is derived from the account balances.
   */
  @IsNumber()
  @IsOptional()
  balance?: number;

  @IsOptional()
  @IsString()
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
