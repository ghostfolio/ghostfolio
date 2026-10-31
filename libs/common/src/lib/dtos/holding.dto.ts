import { IsNumber, IsString, Max, Min, ValidateIf } from 'class-validator';

/**
 * Accepts the allocation as weight (format of the asset profile) or as
 * allocationInPercentage (format of the export), at least one is required
 */
export class HoldingDto {
  @IsNumber()
  @Max(1)
  @Min(0)
  @ValidateIf(({ weight }, value) => {
    return value !== undefined || weight === undefined;
  })
  allocationInPercentage?: number;

  @IsString()
  name: string;

  @IsNumber()
  @Max(1)
  @Min(0)
  @ValidateIf(({ allocationInPercentage }, value) => {
    return value !== undefined || allocationInPercentage === undefined;
  })
  weight?: number;
}
