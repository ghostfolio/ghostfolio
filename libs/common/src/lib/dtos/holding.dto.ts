import { IsNumber, IsString, Max, Min } from 'class-validator';

export class HoldingDto {
  @IsNumber()
  @Max(1)
  @Min(0)
  allocationInPercentage: number;

  @IsString()
  name: string;
}
