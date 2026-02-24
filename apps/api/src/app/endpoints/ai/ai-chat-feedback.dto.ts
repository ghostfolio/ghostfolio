import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength
} from 'class-validator';

export class AiChatFeedbackDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  public comment?: string;

  @IsString()
  @IsIn(['up', 'down'])
  public rating: 'down' | 'up';

  @IsString()
  @IsNotEmpty()
  public sessionId: string;
}
