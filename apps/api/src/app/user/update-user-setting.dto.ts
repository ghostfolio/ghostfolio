import { IsBoolean, IsNumber, IsOptional } from 'class-validator';

export class UpdateUserSettingDto {
  @IsNumber()
  @IsOptional()
  emergencyFund?: number;

  @IsBoolean()
  @IsOptional()
  isNewCalculationEngine?: boolean;

  @IsBoolean()
  @IsOptional()
  isRestrictedView?: boolean;
}
