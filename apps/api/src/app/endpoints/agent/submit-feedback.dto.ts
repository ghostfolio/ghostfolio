import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class SubmitFeedbackDto {
  @IsString()
  requestId: string;

  @IsIn([-1, 1])
  rating: number;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  comment?: string;
}
