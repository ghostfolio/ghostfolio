import {
  getWebFetchBody,
  getWebFetchError
} from '@ghostfolio/api/helper/web-fetch.helper';
import { PropertyService } from '@ghostfolio/api/services/property/property.service';
import {
  DEFAULT_OPENROUTER_ENGINE_WEB_FETCH,
  PROPERTY_API_KEY_OPENROUTER,
  PROPERTY_OPENROUTER_ENGINE_WEB_FETCH,
  PROPERTY_OPENROUTER_MODEL,
  PROPERTY_OPENROUTER_MODEL_WEB_FETCH,
  PROPERTY_PROXY_ROUTES,
  PROPERTY_WEB_FETCH_ROUTES
} from '@ghostfolio/common/config';

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText, jsonSchema, tool } from 'ai';
import { isFQDN } from 'class-validator';
import { isPlainObject } from 'lodash-es';
import ms from 'ms';

import { ProxyRoute } from './interfaces/proxy-route.interface';
import { WebFetchRoute } from './interfaces/web-fetch-route.interface';

@Injectable()
export class FetchService implements OnModuleInit {
  private readonly logger = new Logger(FetchService.name);

  private static readonly BODY_PREVIEW_LENGTH = 500;
  private static readonly REDACTED_QUERY_PARAM_NAMES = [
    'apikey',
    'api_token',
    'key',
    'token'
  ];
  private static readonly WEB_FETCH_TIMEOUT = ms('30 seconds');

  private hasLoggedMissingConfiguration = false;
  private proxyRoutes: ProxyRoute[] = [];
  private webFetchRoutes: WebFetchRoute[] = [];

  public constructor(private readonly propertyService: PropertyService) {}

  public async onModuleInit() {
    this.proxyRoutes =
      (await this.propertyService.getByKey<ProxyRoute[]>(
        PROPERTY_PROXY_ROUTES
      )) ?? [];

    this.webFetchRoutes = this.getValidWebFetchRoutes(
      await this.propertyService.getByKey<WebFetchRoute[]>(
        PROPERTY_WEB_FETCH_ROUTES
      )
    );
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
    const [
      openRouterApiKey,
      openRouterEngineWebFetch,
      openRouterModel,
      openRouterModelWebFetch
    ] = await Promise.all([
      this.propertyService.getByKey<string>(PROPERTY_API_KEY_OPENROUTER),
      this.propertyService.getByKey<string>(
        PROPERTY_OPENROUTER_ENGINE_WEB_FETCH
      ),
      this.propertyService.getByKey<string>(PROPERTY_OPENROUTER_MODEL),
      this.propertyService.getByKey<string>(PROPERTY_OPENROUTER_MODEL_WEB_FETCH)
    ]);

    const engine =
      openRouterEngineWebFetch || DEFAULT_OPENROUTER_ENGINE_WEB_FETCH;
    const model = openRouterModelWebFetch || openRouterModel;

    if (!model || !openRouterApiKey) {
      if (!this.hasLoggedMissingConfiguration) {
        const missing = [
          ...(openRouterApiKey ? [] : [PROPERTY_API_KEY_OPENROUTER]),
          ...(model ? [] : [PROPERTY_OPENROUTER_MODEL])
        ].join(',');

        this.logger.warn(
          `Web fetch tool is not available (${this.getWebFetchLogDetails({
            engine,
            reason: `missing_configuration missing=${missing}`
          })})`
        );

        this.hasLoggedMissingConfiguration = true;
      }

      return undefined;
    }

    const startTime = performance.now();

    try {
      const openRouterService = createOpenRouter({ apiKey: openRouterApiKey });

      const { finishReason, sources, text } = await generateText({
        model: openRouterService.chat(model),
        prompt: [
          'You have access to a web_fetch tool. You MUST call it to retrieve the URL below, do not answer from prior knowledge.',
          'Return the fetched response body exactly as received: raw body only, no commentary, no Markdown, and no code fences.',
          `URL: ${url}`
        ].join('\n'),
        temperature: 0,
        timeout: FetchService.WEB_FETCH_TIMEOUT,
        tools: {
          // Provider-executed tool: lets OpenRouter perform the actual web
          // request server-side via its `web_fetch` engine. `args` and `id`
          // are the OpenRouter-specific identifiers. The engine must stay
          // nested in `parameters`, because the provider spreads `args` on the
          // top level of the tool object, where OpenRouter ignores it. Nested
          // keys need snake case, as only the top level gets converted. The
          // input schema is left open as the arguments are supplied by the
          // model.
          web_fetch: tool({
            args: { parameters: { engine } },
            id: 'openrouter.web_fetch',
            inputSchema: jsonSchema({
              additionalProperties: true,
              type: 'object'
            }),
            isProviderExecuted: true,
            type: 'provider'
          })
        }
      });

      const candidates = [
        ...(sources ?? []).map((source) => {
          return source.providerMetadata?.openrouter?.content;
        }),
        ...(finishReason === 'stop' ? [text] : [])
      ];

      const isJson =
        webFetchRoute.responseContentType?.includes('application/json') ??
        false;

      let rejectedBody: string | undefined;

      for (const candidate of candidates) {
        if (typeof candidate !== 'string') {
          continue;
        }

        const body = getWebFetchBody({ candidate, isJson });

        if (!body) {
          // A failure message tells more than the text of a later candidate
          if (
            !rejectedBody ||
            getWebFetchError({ candidate: rejectedBody }) === undefined
          ) {
            rejectedBody = candidate.trim() || rejectedBody;
          }

          continue;
        }

        this.logger.log(
          `Routed ${this.redactUrl(url)} via web fetch tool (${this.getWebFetchLogDetails(
            { engine, finishReason, model, startTime }
          )})`
        );

        return new Response(body, {
          headers: webFetchRoute.responseContentType
            ? { 'content-type': webFetchRoute.responseContentType }
            : undefined
        });
      }

      this.logger.warn(
        `Web fetch tool returned no usable body for ${this.redactUrl(url)} (${this.getWebFetchLogDetails(
          {
            engine,
            finishReason,
            model,
            startTime,
            reason: this.getRejectionReason({ finishReason, rejectedBody })
          }
        )})`
      );

      this.logger.debug(
        `Web fetch tool response for ${this.redactUrl(url)} (${
          sources?.length ?? 0
        } sources): ${this.getBodyPreview(rejectedBody || text)}`
      );

      return undefined;
    } catch (error) {
      this.logger.error(
        `Web fetch tool failed for ${this.redactUrl(url)} (${this.getWebFetchLogDetails(
          { engine, model, startTime, reason: 'request_error' }
        )}): ${error instanceof Error ? error.message : String(error)}`
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

  /**
   * Makes a short single-line preview of a response body for the log. Gives
   * back a placeholder if the body is empty.
   */
  private getBodyPreview(body: string): string {
    if (!body) {
      return '(empty)';
    }

    const singleLineBody = body
      .replace(
        new RegExp(
          `(${FetchService.REDACTED_QUERY_PARAM_NAMES.join('|')})=[^&\\s"']+`,
          'gi'
        ),
        '$1=*******'
      )
      .replace(/\s+/g, ' ')
      .trim();

    return singleLineBody.length > FetchService.BODY_PREVIEW_LENGTH
      ? `${singleLineBody.slice(0, FetchService.BODY_PREVIEW_LENGTH)}…`
      : singleLineBody;
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

  private getRejectionReason({
    finishReason,
    rejectedBody
  }: {
    finishReason: string;
    rejectedBody?: string;
  }) {
    if (!rejectedBody) {
      return finishReason === 'stop' ? 'empty_body' : 'finish_reason';
    }

    const error = getWebFetchError({ candidate: rejectedBody });

    // The model can repeat the URL of the prompt, which can contain a secret
    return error !== undefined
      ? `failure_message error="${this.getBodyPreview(error.replace(/https?:\/\/\S+/gi, '[url]'))}"`
      : 'invalid_body';
  }

  /**
   * Gives back the valid routes of the property. A route which is not valid
   * would never match, so it gets a warning instead of a silent direct request.
   */
  private getValidWebFetchRoutes(routes: unknown): WebFetchRoute[] {
    if (routes === undefined || routes === null) {
      return [];
    }

    if (!Array.isArray(routes)) {
      this.logger.warn(
        `Ignoring the property ${PROPERTY_WEB_FETCH_ROUTES}: It must be an array`
      );

      return [];
    }

    return routes.filter((route): route is WebFetchRoute => {
      const isValid = this.isValidWebFetchRoute(route);

      if (!isValid) {
        this.logger.warn(
          `Ignoring an invalid route of the property ${PROPERTY_WEB_FETCH_ROUTES}: ${JSON.stringify(route)}`
        );
      }

      return isValid;
    });
  }

  private getWebFetchLogDetails({
    engine,
    finishReason,
    model,
    reason,
    startTime
  }: {
    engine: string;
    finishReason?: string;
    model?: string;
    reason?: string;
    startTime?: number;
  }) {
    const details = {
      engine,
      finishReason,
      model,
      duration:
        startTime === undefined
          ? undefined
          : `${Math.round(performance.now() - startTime)}ms`,
      reason
    };

    return Object.entries(details)
      .filter(([, value]) => {
        return value !== undefined;
      })
      .map(([key, value]) => {
        return `${key}=${value}`;
      })
      .join(' ');
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

  private isValidWebFetchRoute(route: unknown) {
    if (!isPlainObject(route)) {
      return false;
    }

    const { domain, responseContentType } = route as Record<string, unknown>;

    return (
      isFQDN(domain) &&
      (responseContentType === undefined ||
        typeof responseContentType === 'string')
    );
  }

  private redactUrl(rawUrl: string): string {
    try {
      const url = new URL(rawUrl);

      for (const key of [...url.searchParams.keys()]) {
        if (
          FetchService.REDACTED_QUERY_PARAM_NAMES.includes(key.toLowerCase())
        ) {
          url.searchParams.set(key, '*******');
        }
      }

      return url.toString();
    } catch {
      return rawUrl;
    }
  }
}
