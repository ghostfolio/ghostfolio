import {
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min
} from 'class-validator';

export class CreateOwnershipDto {
  @IsString()
  accountId: string;

  @IsNumber()
  @Min(0.01)
  @Max(100)
  ownershipPercent: number;

  @IsISO8601()
  effectiveDate: string;

  @IsOptional()
  @IsISO8601()
  acquisitionDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costBasis?: number;
}
