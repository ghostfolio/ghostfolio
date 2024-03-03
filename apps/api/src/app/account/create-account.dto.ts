import { Transform, TransformFnParams } from 'class-transformer';
import {
  IsBoolean,
  IsISO4217CurrencyCode,
  IsNumber,
  IsOptional,
  IsString,
  ValidateIf
} from 'class-validator';
import { isString } from 'lodash';

export class CreateAccountDto {
  @IsNumber()
  balance: number;

  @IsOptional()
  @IsString()
  @Transform(({ value }: TransformFnParams) =>
    isString(value) ? value.trim() : value
  )
  comment?: string;

  @IsISO4217CurrencyCode()
  currency: string;

  @IsOptional()
  @IsString()
  id?: string;

  @IsBoolean()
  @IsOptional()
  isExcluded?: boolean;

  @IsString()
  name: string;

  @IsString()
  @ValidateIf((object, value) => value !== null)
  platformId: string | null;
}
