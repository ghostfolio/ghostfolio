import { IsISO31661Alpha2, IsNumber, Max, Min } from 'class-validator';

export class CountryDto {
  @IsISO31661Alpha2()
  code: string;

  @IsNumber()
  @Min(0)
  @Max(1)
  weight: number;
}
