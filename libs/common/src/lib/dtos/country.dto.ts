import { IsISO31661Alpha2, IsNumber, Max, Min } from 'class-validator';

export class CountryDto {
  @IsISO31661Alpha2()
  code: string;

  @IsNumber()
  @Max(1)
  @Min(0)
  weight: number;
}
