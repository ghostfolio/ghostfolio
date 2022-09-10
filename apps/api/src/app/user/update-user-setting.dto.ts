import { UniqueAsset } from '@ghostfolio/common/interfaces';
import type { DateRange, ViewMode } from '@ghostfolio/common/types';
import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString
} from 'class-validator';

export class UpdateUserSettingDto {
  @IsOptional()
  @IsString()
  baseCurrency?: string;

  @IsObject()
  @IsOptional()
  benchmark?: UniqueAsset;

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
