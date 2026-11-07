import { COMMENT_MAXIMUM_LENGTH } from '@ghostfolio/common/config';

import { Transform, TransformFnParams } from 'class-transformer';
import {
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength
} from 'class-validator';
import { isString } from 'lodash-es';

export class AccountBalanceDto {
  @IsOptional()
  @IsString()
  @MaxLength(COMMENT_MAXIMUM_LENGTH)
  @Transform(({ value }: TransformFnParams) =>
    isString(value) ? value.trim() : value
  )
  comment?: string | null;

  @IsISO8601()
  date: string;

  @IsNumber()
  value: number;
}
