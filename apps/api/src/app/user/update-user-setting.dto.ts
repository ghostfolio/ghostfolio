import type {
  ColorScheme,
  DateRange,
  HoldingsViewMode,
  ViewMode,
  XRayRulesSettings
} from '@ghostfolio/common/types';

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

import { IsCurrencyCode } from '../../validators/is-currency-code';

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

  @IsNumber()
  @IsOptional()
  projectedTotalAmount?: number;

  @IsISO8601()
  @IsOptional()
  retirementDate?: string;

  @IsNumber()
  @IsOptional()
  savingsRate?: number;

  @IsIn(['DEFAULT', 'ZEN'] as ViewMode[])
  @IsOptional()
  viewMode?: ViewMode;

  @IsOptional()
  xRayRules?: XRayRulesSettings;
}
