import { AccountType } from '@prisma/client';
import { IsString, ValidateIf } from 'class-validator';

export class CreateAccountDto {
  @IsString()
  accountType: AccountType;

  @IsString()
  name: string;

  @IsString()
  @ValidateIf((object, value) => value !== null)
  platformId: string | null;
}
