import { redactPaths } from '@ghostfolio/api/helper/object.helper';
import { PropertyService } from '@ghostfolio/api/services/property/property.service';
import {
  PROPERTY_API_KEY_OPENROUTER,
  PROPERTY_OPENROUTER_MODEL,
  PROPERTY_WEB_FETCH_DOMAINS
} from '@ghostfolio/common/config';

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText, jsonSchema, tool } from 'ai';
import ms from 'ms';

import { WebFetchDomain } from './interfaces/web-fetch-domain.interface';

@Injectable()
export class FetchService implements OnModuleInit {
  private static readonly REDACTED_QUERY_PARAM_NAMES = ['apikey', 'api_token'];

  private webFetchDomains: WebFetchDomain[] = [];

  public constructor(private readonly propertyService: PropertyService) {}

  public async onModuleInit() {
    this.webFetchDomains =
      (await this.propertyService.getByKey<WebFetchDomain[]>(
        PROPERTY_WEB_FETCH_DOMAINS
      )) ?? [];
  }

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

      const { sources, text } = await generateText({
        abortSignal: AbortSignal.timeout(ms('30 seconds')),
        model: openRouterService.chat(openRouterModel),
        prompt: [
          'You have access to a web_fetch tool. You MUST call it to retrieve the URL below, do not answer from prior knowledge.',
          'Return the fetched response body exactly as received: raw body only, no commentary, no Markdown, and no code fences.',
          `URL: ${url}`
        ].join('\n'),
        tools: {
          web_fetch: tool({
            args: { engine: 'openrouter' },
            id: 'openrouter.web_fetch',
            inputSchema: jsonSchema({
              additionalProperties: true,
              type: 'object'
            }),
            type: 'provider'
          })
        }
      });

      const candidates = [
        ...sources.map((source) => {
          return source.providerMetadata?.openrouter?.content;
        }),
        text
      ];

      for (const candidate of candidates) {
        if (typeof candidate !== 'string') {
          continue;
        }

        const body = candidate.trim();

        try {
          JSON.parse(body);
        } catch {
          continue;
        }

        Logger.debug(
          `Routed ${this.redactUrl(url)} via web fetch tool`,
          'FetchService'
        );

        return new Response(body, {
          headers: { 'content-type': 'application/json' }
        });
      }

      return undefined;
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
}
