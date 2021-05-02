import { AccountType } from '@prisma/client';
import { IsString, ValidateIf } from 'class-validator';

export class UpdateAccountDto {
  @IsString()
  accountType: AccountType;

  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsString()
  @ValidateIf((object, value) => value !== null)
  platformId: string | null;
}
