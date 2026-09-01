import { Injectable } from '@nestjs/common';

@Injectable()
export class McpService {
  public getTextResult(text: string) {
    return { content: [{ text, type: 'text' as const }] };
  }
}
