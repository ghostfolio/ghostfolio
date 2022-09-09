import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateUserSettingDto {
  @IsOptional()
  @IsString() // TODO: DateRange
  dateRange?: string;

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
}
