import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class AgentFeedbackDto {
  @IsUUID()
  interactionId: string;

  @IsString()
  @IsIn(['positive', 'negative'])
  rating: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}
