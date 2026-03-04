import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength
} from 'class-validator';

export class AgentChatRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  message: string;

  @IsOptional()
  @IsUUID(4)
  conversationId?: string;

  @IsOptional()
  @IsUUID(4)
  sessionId?: string;
}
