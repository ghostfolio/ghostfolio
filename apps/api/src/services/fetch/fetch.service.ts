import { redactPaths } from '@ghostfolio/api/helper/object.helper';
import { PropertyService } from '@ghostfolio/api/services/property/property.service';
import {
  PROPERTY_API_KEY_OPENROUTER,
  PROPERTY_OPENROUTER_MODEL
} from '@ghostfolio/common/config';

import { Injectable, Logger } from '@nestjs/common';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText, jsonSchema, tool } from 'ai';

@Injectable()
export class FetchService {
  private static readonly REDACTED_QUERY_PARAM_NAMES = ['apikey', 'api_token'];

  private webFetchDomains: { domain: string }[] = [];

  public constructor(private readonly propertyService: PropertyService) {}

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

    if (method === 'GET' && this.matchesWebFetchDomain(url)) {
      const response = await this.fetchViaWebFetchTool(url);

      if (response) {
        return response;
      }
    }

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

  private extractJsonFromWebFetchResult({
    response,
    text
  }: {
    response: { body?: unknown };
    text: string;
  }): string | undefined {
    const candidates: string[] = [];

    const body = response?.body as
      | {
          choices?: {
            message?: {
              annotations?: { url_citation?: { content?: string } }[];
            };
          }[];
        }
      | undefined;

    for (const annotation of body?.choices?.[0]?.message?.annotations ?? []) {
      if (annotation?.url_citation?.content) {
        candidates.push(annotation.url_citation.content);
      }
    }

    if (text) {
      candidates.push(text);
    }

    for (const candidate of candidates) {
      const sanitized = this.sanitizeJson(candidate);

      if (sanitized) {
        return sanitized;
      }
    }

    return undefined;
  }

  private async fetchViaWebFetchTool(
    url: string
  ): Promise<Response | undefined> {
    const [openRouterApiKey, openRouterModel] = await Promise.all([
      this.propertyService.getByKey<string>(PROPERTY_API_KEY_OPENROUTER),
      this.propertyService.getByKey<string>(PROPERTY_OPENROUTER_MODEL)
    ]);

    if (!openRouterApiKey || !openRouterModel) {
      return undefined;
    }

    try {
      const openRouterService = createOpenRouter({ apiKey: openRouterApiKey });

      const { response, text } = await generateText({
        model: openRouterService.chat(openRouterModel),
        prompt: [
          'Fetch the following URL and return its response body exactly as received.',
          'Respond with the raw body only (no commentary, no Markdown, and no code fences).',
          `URL: ${url}`
        ].join('\n'),
        tools: {
          web_fetch: tool({
            args: { engine: 'auto' },
            id: 'openrouter.web_fetch',
            inputSchema: jsonSchema({
              additionalProperties: true,
              type: 'object'
            }),
            type: 'provider'
          })
        }
      });

      const body = this.extractJsonFromWebFetchResult({ response, text });

      if (!body) {
        return undefined;
      }

      Logger.debug(
        `Routed ${this.redactUrl(url)} via web fetch tool`,
        'FetchService'
      );

      return new Response(body, {
        headers: { 'content-type': 'application/json' }
      });
    } catch (error) {
      Logger.error(
        `Web fetch tool failed for ${this.redactUrl(url)}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        'FetchService'
      );

      return undefined;
    }
  }

  private matchesWebFetchDomain(rawUrl: string): boolean {
    try {
      const { hostname } = new URL(rawUrl);

      return this.webFetchDomains.some(({ domain }) => {
        return hostname === domain || hostname.endsWith(`.${domain}`);
      });
    } catch {
      return false;
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

  private sanitizeJson(value: string): string | undefined {
    const sanitized = value
      .trim()
      .replace(/^```(?:json)?/i, '')
      .replace(/```$/, '')
      .trim();

    try {
      JSON.parse(sanitized);

      return sanitized;
    } catch {
      return undefined;
    }
  }
}
