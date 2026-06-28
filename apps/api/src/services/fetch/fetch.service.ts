import { redactPaths } from '@ghostfolio/api/helper/object.helper';
import { PropertyService } from '@ghostfolio/api/services/property/property.service';
import {
  PROPERTY_API_KEY_OPENROUTER,
  PROPERTY_OPENROUTER_MODEL,
  PROPERTY_OPENROUTER_MODEL_WEB_FETCH,
  PROPERTY_PROXY_ROUTES,
  PROPERTY_WEB_FETCH_ROUTES
} from '@ghostfolio/common/config';

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText, jsonSchema, tool } from 'ai';
import ms from 'ms';

import { ProxyRoute } from './interfaces/proxy-route.interface';
import { WebFetchRoute } from './interfaces/web-fetch-route.interface';

@Injectable()
export class FetchService implements OnModuleInit {
  private readonly logger = new Logger(FetchService.name);

  private static readonly REDACTED_QUERY_PARAM_NAMES = ['apikey', 'api_token'];
  private static readonly WEB_FETCH_TIMEOUT = ms('30 seconds');

  private proxyRoutes: ProxyRoute[] = [];
  private webFetchRoutes: WebFetchRoute[] = [];

  public constructor(private readonly propertyService: PropertyService) {}

  public async onModuleInit() {
    this.proxyRoutes =
      (await this.propertyService.getByKey<ProxyRoute[]>(
        PROPERTY_PROXY_ROUTES
      )) ?? [];

    this.webFetchRoutes =
      (await this.propertyService.getByKey<WebFetchRoute[]>(
        PROPERTY_WEB_FETCH_ROUTES
      )) ?? [];
  }

  public async fetch(input: RequestInfo | URL, init?: RequestInit) {
    const method = (
      init?.method ??
      (input instanceof Request ? input.method : undefined) ??
      'GET'
    ).toUpperCase();

    const url = input instanceof Request ? input.url : input.toString();
    const urlRedacted = this.redactUrl(url);

    this.logger.debug(`${method} ${urlRedacted}`);

    if (method === 'GET') {
      const webFetchRoute = this.getMatchingWebFetchRoute(url);

      if (webFetchRoute) {
        const response = await this.fetchViaWebFetchTool({
          url,
          webFetchRoute
        });

        if (response) {
          return response;
        }
      }
    }

    const proxiedInput = this.applyProxyRoute(input);

    try {
      return await globalThis.fetch(proxiedInput, init);
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          `${method} ${urlRedacted} failed: [${error.name}] ${error.message}`
        );
      } else {
        this.logger.error(`${method} ${urlRedacted} failed: ${String(error)}`);
      }

      throw error;
    }
  }

  private async fetchViaWebFetchTool({
    url,
    webFetchRoute
  }: {
    url: string;
    webFetchRoute: WebFetchRoute;
  }) {
    const [openRouterApiKey, openRouterModel, openRouterModelWebFetch] =
      await Promise.all([
        this.propertyService.getByKey<string>(PROPERTY_API_KEY_OPENROUTER),
        this.propertyService.getByKey<string>(PROPERTY_OPENROUTER_MODEL),
        this.propertyService.getByKey<string>(
          PROPERTY_OPENROUTER_MODEL_WEB_FETCH
        )
      ]);

    const model = openRouterModelWebFetch || openRouterModel;

    if (!model || !openRouterApiKey) {
      return undefined;
    }

    try {
      const openRouterService = createOpenRouter({ apiKey: openRouterApiKey });

      const { sources, text } = await generateText({
        model: openRouterService.chat(model),
        prompt: [
          'You have access to a web_fetch tool. You MUST call it to retrieve the URL below, do not answer from prior knowledge.',
          'Return the fetched response body exactly as received: raw body only, no commentary, no Markdown, and no code fences.',
          `URL: ${url}`
        ].join('\n'),
        timeout: FetchService.WEB_FETCH_TIMEOUT,
        tools: {
          // Provider-defined tool: lets OpenRouter perform the actual web
          // request server-side via its `web_fetch` engine. `id` and `args`
          // are the OpenRouter-specific identifiers; the input schema is left
          // open as the arguments are supplied by the model.
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
        ...(sources ?? []).map((source) => {
          return source.providerMetadata?.openrouter?.content;
        }),
        text
      ];

      for (const candidate of candidates) {
        if (typeof candidate !== 'string') {
          continue;
        }

        const body = candidate.trim();

        if (!body) {
          continue;
        }

        if (webFetchRoute.responseContentType?.includes('application/json')) {
          try {
            JSON.parse(body);
          } catch {
            continue;
          }
        }

        this.logger.debug(`Routed ${this.redactUrl(url)} via web fetch tool`);

        return new Response(body, {
          headers: webFetchRoute.responseContentType
            ? { 'content-type': webFetchRoute.responseContentType }
            : undefined
        });
      }

      return undefined;
    } catch (error) {
      this.logger.error(
        `Web fetch tool failed for ${this.redactUrl(url)}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );

      return undefined;
    }
  }

  /**
   * Rewrites the origin (protocol, host and port) of a request when its domain
   * matches a configured {@link ProxyRoute}, preserving path and query. Returns
   * the input unchanged when no route matches or parsing fails.
   */
  private applyProxyRoute(input: RequestInfo | URL): RequestInfo | URL {
    let requestUrl: URL;

    try {
      requestUrl = new URL(
        input instanceof Request ? input.url : input.toString()
      );
    } catch {
      return input;
    }

    const route = this.proxyRoutes.find(({ domain }) => {
      return this.hostnameMatchesDomain({
        domain,
        hostname: requestUrl.hostname
      });
    });

    if (!route) {
      return input;
    }

    try {
      const proxyUrl = new URL(route.url);

      requestUrl.host = proxyUrl.host;
      requestUrl.protocol = proxyUrl.protocol;
    } catch {
      this.logger.warn(
        `Skipping proxy route for "${route.domain}": invalid url "${route.url}"`
      );

      return input;
    }

    return input instanceof Request
      ? new Request(requestUrl.toString(), input)
      : requestUrl.toString();
  }

  private getMatchingWebFetchRoute(url: string) {
    try {
      const { hostname } = new URL(url);

      return this.webFetchRoutes.find(({ domain }) => {
        return this.hostnameMatchesDomain({ domain, hostname });
      });
    } catch {
      return undefined;
    }
  }

  private hostnameMatchesDomain({
    domain,
    hostname
  }: {
    domain: string;
    hostname: string;
  }): boolean {
    return hostname === domain || hostname.endsWith(`.${domain}`);
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
