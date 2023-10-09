import type {
  ColorScheme,
  DateRange,
  ViewMode
} from '@ghostfolio/common/types';
import {
  IsBoolean,
  IsISO8601,
  IsIn,
  IsNumber,
  IsOptional,
  IsString
} from 'class-validator';

export class UpdateUserSettingDto {
  @IsNumber()
  @IsOptional()
  annualInterestRate?: number;

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
  projectedTotalAmount?: number;

  @IsISO8601()
  @IsOptional()
  retirementDate?: string;

  @IsNumber()
  @IsOptional()
  savingsRate?: number;

  @IsIn(<ViewMode[]>['DEFAULT', 'ZEN'])
  @IsOptional()
  viewMode?: ViewMode;
}
