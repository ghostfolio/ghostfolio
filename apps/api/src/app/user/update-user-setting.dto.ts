import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateUserSettingDto {
  @IsBoolean()
  @IsOptional()
  isNewCalculationEngine?: boolean;

  @IsBoolean()
  @IsOptional()
  isRestrictedView?: boolean;
}
