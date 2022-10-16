import type {
  ColorScheme,
  DateRange,
  ViewMode
} from '@ghostfolio/common/types';
import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString
} from 'class-validator';

export class UpdateUserSettingDto {
  @IsOptional()
  @IsString()
  baseCurrency?: string;

  @IsString()
  @IsOptional()
  benchmark?: string;

  @IsIn(<ColorScheme[]>['DARK', 'LIGHT'])
  @IsOptional()
  colorScheme?: ColorScheme;

  @IsIn(<DateRange[]>['1d', '1y', '5y', 'max', 'ytd'])
  @IsOptional()
  dateRange?: DateRange;

  @IsNumber()
  @IsOptional()
  emergencyFund?: number;

  @IsBoolean()
  @IsOptional()
  isExperimentalFeatures?: boolean;

  @IsBoolean()
  @IsOptional()
  isRestrictedView?: boolean;

  @IsString()
  @IsOptional()
  language?: string;

  @IsString()
  @IsOptional()
  locale?: string;

  @IsNumber()
  @IsOptional()
  savingsRate?: number;

  @IsIn(<ViewMode[]>['DEFAULT', 'ZEN'])
  @IsOptional()
  viewMode?: ViewMode;
}
