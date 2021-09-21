import { ViewMode } from '@prisma/client';
import { IsString } from 'class-validator';

export class UpdateUserSettingsDto {
  @IsString()
  baseCurrency: string;

  @IsString()
  viewMode: ViewMode;
}
