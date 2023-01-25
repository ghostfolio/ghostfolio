import { AccountType } from '@prisma/client';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  ValidateIf
} from 'class-validator';

export class CreateAccountDto {
  @IsOptional()
  @IsString()
  id: string;

  @IsOptional()
  @IsBoolean()
  isDefault: boolean;

  @IsString()
  accountType: AccountType;

  @IsNumber()
  balance: number;

  @IsString()
  currency: string;

  @IsBoolean()
  @IsOptional()
  isExcluded?: boolean;

  @IsString()
  name: string;

  @IsString()
  @ValidateIf((object, value) => value !== null)
  platformId: string | null;
}
