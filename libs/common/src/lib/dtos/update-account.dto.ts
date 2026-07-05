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

export class UpdateAccountDto {
  @IsNumber()
  balance: number;

  @IsOptional()
  @IsString()
  @Transform(({ value }: TransformFnParams) =>
    isString(value) ? value.trim() : value
  )
  comment?: string;

  @IsCurrencyCode()
  currency: string;

  @IsString()
  id: string;

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
