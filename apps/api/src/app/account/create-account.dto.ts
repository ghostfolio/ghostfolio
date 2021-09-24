import { AccountType } from '@prisma/client';
import { IsNumber, IsString, ValidateIf } from 'class-validator';

export class CreateAccountDto {
  @IsString()
  accountType: AccountType;

  @IsNumber()
  balance: number;

  @IsString()
  currency: string;

  @IsString()
  name: string;

  @IsString()
  @ValidateIf((object, value) => value !== null)
  platformId: string | null;
}
