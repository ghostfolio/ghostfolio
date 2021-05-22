import { Currency, DisplayMode } from '@prisma/client';
import { IsString } from 'class-validator';

export class UpdateUserSettingsDto {
  @IsString()
  baseCurrency: Currency;

  @IsString()
  displayMode: DisplayMode;
}
