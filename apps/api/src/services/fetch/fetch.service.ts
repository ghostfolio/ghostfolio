import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class FetchService {
  public async fetch(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    const method = (
      init?.method ??
      (input instanceof Request ? input.method : undefined) ??
      'GET'
    ).toUpperCase();

    const url = input instanceof Request ? input.url : input.toString();

    Logger.debug(`${method} ${url}`, 'FetchService');

    try {
      return await globalThis.fetch(input, init);
    } catch (error) {
      if (error instanceof Error) {
        Logger.error(
          `${method} ${url} failed: [${error.name}] ${error.message}`,
          'FetchService'
        );
      } else {
        Logger.error(
          `${method} ${url} failed: ${String(error)}`,
          'FetchService'
        );
      }

      throw error;
    }
  }
}
