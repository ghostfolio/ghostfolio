import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsString,
  Matches,
  MaxLength,
  Validate,
  ValidateNested,
  ValidatorConstraint,
  ValidatorConstraintInterface
} from 'class-validator';

const AI_CHAT_ROLES = ['assistant', 'user'] as const;

@ValidatorConstraint({ name: 'lastAiChatMessageIsFromUser' })
class LastAiChatMessageIsFromUserConstraint implements ValidatorConstraintInterface {
  public validate(messages: AiChatMessageDto[]) {
    return Array.isArray(messages) && messages.at(-1)?.role === 'user';
  }

  public defaultMessage() {
    return 'The final chat message must be from the user';
  }
}

export class AiChatMessageDto {
  @IsString()
  @Matches(/\S/, { message: 'content must contain visible text' })
  @MaxLength(2000)
  content: string;

  @IsIn(AI_CHAT_ROLES)
  role: (typeof AI_CHAT_ROLES)[number];
}

export class AiChatDto {
  @ArrayMaxSize(12)
  @ArrayMinSize(1)
  @IsArray()
  @Type(() => AiChatMessageDto)
  @Validate(LastAiChatMessageIsFromUserConstraint)
  @ValidateNested({ each: true })
  messages: AiChatMessageDto[];
}
