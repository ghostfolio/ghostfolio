import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import 'reflect-metadata';

import { AiChatDto } from './ai-chat.dto';

describe('AiChatDto', () => {
  it('accepts a bounded conversation ending with a user message', async () => {
    const dto = plainToInstance(AiChatDto, {
      messages: [
        { content: 'What is my largest holding?', role: 'user' },
        { content: 'Let me check.', role: 'assistant' },
        { content: 'And its allocation?', role: 'user' }
      ]
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects a conversation that does not end with a user message', async () => {
    const dto = plainToInstance(AiChatDto, {
      messages: [{ content: 'An unfinished answer', role: 'assistant' }]
    });

    const errors = await validate(dto);

    expect(errors[0].constraints).toEqual(
      expect.objectContaining({
        lastAiChatMessageIsFromUser:
          'The final chat message must be from the user'
      })
    );
  });

  it('rejects excessive or empty message content', async () => {
    const dto = plainToInstance(AiChatDto, {
      messages: [{ content: ' '.repeat(2001), role: 'user' }]
    });

    const errors = await validate(dto);
    const nestedConstraints = errors[0].children[0].children[0].constraints;

    expect(nestedConstraints).toEqual(
      expect.objectContaining({
        matches: 'content must contain visible text',
        maxLength: 'content must be shorter than or equal to 2000 characters'
      })
    );
  });
});
