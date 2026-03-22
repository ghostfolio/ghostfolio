import { IsInt, IsString, Min } from 'class-validator';

export class UploadK1Dto {
  @IsString()
  partnershipId: string;

  @IsInt()
  @Min(1900)
  taxYear: number;
}
