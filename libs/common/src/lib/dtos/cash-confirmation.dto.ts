import { IsBoolean, IsObject, IsOptional } from 'class-validator';

export class CashConfirmationDto {
  @IsBoolean()
  @IsOptional()
  confirmNegativeBalance?: boolean;

  @IsObject()
  @IsOptional()
  cashRevisions?: Record<string, number>;
}
