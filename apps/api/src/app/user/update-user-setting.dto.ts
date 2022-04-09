import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateUserSettingDto {
  @IsNumber()
  @IsOptional()
  emergencyFund?: number;

  @IsBoolean()
  @IsOptional()
  isRestrictedView?: boolean;

  @IsString()
  @IsOptional()
  locale?: string;
}
