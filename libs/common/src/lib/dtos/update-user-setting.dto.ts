import { XRayRulesSettings } from '@ghostfolio/common/interfaces';
import type {
  ColorScheme,
  DateRange,
  HoldingsViewMode,
  ViewMode
} from '@ghostfolio/common/types';
import { IsCurrencyCode } from '@ghostfolio/common/validators/is-currency-code';

import {
  IsArray,
  IsBoolean,
  IsISO8601,
  IsIn,
  IsNumber,
  IsOptional,
  IsString
} from 'class-validator';
import { eachYearOfInterval, format } from 'date-fns';

export class UpdateUserSettingDto {
  @IsNumber()
  @IsOptional()
  annualInterestRate?: number;

  @IsCurrencyCode()
  @IsOptional()
  baseCurrency?: string;

  @IsString()
  @IsOptional()
  benchmark?: string;

  @IsIn(['DARK', 'LIGHT'] as ColorScheme[])
  @IsOptional()
  colorScheme?: ColorScheme;

  @IsIn([
    '1d',
    '1y',
    '5y',
    'max',
    'mtd',
    'wtd',
    'ytd',
    ...eachYearOfInterval({ end: new Date(), start: new Date(0) }).map(
      (date) => {
        return format(date, 'yyyy');
      }
    )
  ] as DateRange[])
  @IsOptional()
  dateRange?: DateRange;

  @IsNumber()
  @IsOptional()
  emergencyFund?: number;

  @IsArray()
  @IsOptional()
  'filters.accounts'?: string[];

  @IsArray()
  @IsOptional()
  'filters.assetClasses'?: string[];

  @IsString()
  @IsOptional()
  'filters.dataSource'?: string;

  @IsString()
  @IsOptional()
  'filters.symbol'?: string;

  @IsArray()
  @IsOptional()
  'filters.tags'?: string[];

  @IsIn(['CHART', 'TABLE'] as HoldingsViewMode[])
  @IsOptional()
  holdingsViewMode?: HoldingsViewMode;

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

  /**
   * The target financial amount the user aims to reach before retiring.
   * Can be explicitly set to null to clear the value and calculate it dynamically.
   */
  @IsNumber()
  @IsOptional()
  projectedTotalAmount?: number | null;

  /**
   * The target date when the user plans to retire.
   * Can be explicitly set to null to clear the value and calculate it dynamically.
   */
  @IsISO8601()
  @IsOptional()
  retirementDate?: string | null;

  @IsNumber()
  @IsOptional()
  safeWithdrawalRate?: number;

  @IsNumber()
  @IsOptional()
  savingsRate?: number;

  @IsIn(['DEFAULT', 'ZEN'] as ViewMode[])
  @IsOptional()
  viewMode?: ViewMode;

  @IsOptional()
  xRayRules?: XRayRulesSettings;
}
