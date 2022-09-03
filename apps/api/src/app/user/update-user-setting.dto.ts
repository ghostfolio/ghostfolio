import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateUserSettingDto {
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
