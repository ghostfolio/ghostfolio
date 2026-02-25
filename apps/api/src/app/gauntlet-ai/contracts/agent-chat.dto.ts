import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

import type { AgentChatRequest } from './agent-chat.types';

export class AgentChatRequestDto implements AgentChatRequest {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  public message: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  public sessionId: string;
}
