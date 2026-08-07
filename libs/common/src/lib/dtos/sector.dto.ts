import { IsNumber, IsString, Max, Min } from 'class-validator';

export class SectorDto {
  @IsString()
  name: string;

  @IsNumber()
  @Max(1)
  @Min(0)
  weight: number;
}
