import { redactPaths } from '@ghostfolio/api/helper/object.helper';

import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class FetchService {
  private static readonly REDACTED_QUERY_PARAM_NAMES = ['apikey', 'api_token'];

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
    const urlRedacted = this.redactUrl(url);

    Logger.debug(`${method} ${urlRedacted}`, 'FetchService');

    try {
      return await globalThis.fetch(input, init);
    } catch (error) {
      if (error instanceof Error) {
        Logger.error(
          `${method} ${urlRedacted} failed: [${error.name}] ${error.message}`,
          'FetchService'
        );
      } else {
        Logger.error(
          `${method} ${urlRedacted} failed: ${String(error)}`,
          'FetchService'
        );
      }

      throw error;
    }
  }

  private redactUrl(rawUrl: string): string {
    try {
      const url = new URL(rawUrl);

      const redacted = redactPaths({
        object: Object.fromEntries(url.searchParams),
        paths: FetchService.REDACTED_QUERY_PARAM_NAMES
      });

      for (const [key, value] of Object.entries(redacted)) {
        if (value === null) {
          url.searchParams.set(key, '*******');
        }
      }

      return url.toString();
    } catch {
      return rawUrl;
    }
  }
}
