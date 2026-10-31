import {
  IsISO31661Alpha2,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min
} from 'class-validator';

export class CountryDto {
  @IsISO31661Alpha2()
  code: string;

  /** Part of the export, not used because it is derived from the code */
  @IsOptional()
  @IsString()
  continent?: string;

  /** Part of the export, not used because it is derived from the code */
  @IsOptional()
  @IsString()
  name?: string;

  @IsNumber()
  @Max(1)
  @Min(0)
  weight: number;
}
