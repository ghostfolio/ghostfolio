import { Currency } from '@prisma/client';
import { IsString } from 'class-validator';

export class UpdateUserSettingsDto {
  @IsString()
  currency: Currency;
}
