import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';

import { Injectable } from '@nestjs/common';
import type { Response } from 'express';
import { Readable } from 'node:stream';

const X_GHOSTFOLIO_USER_ID = 'x-ghostfolio-user-id';

@Injectable()
export class AgentService {
  public constructor(
    private readonly configurationService: ConfigurationService
  ) {}

  public getAgentBaseUrl(): string {
    const url = this.configurationService.get('AGENT_SERVICE_URL');
    return typeof url === 'string' ? url.trim() : '';
  }

  public isEnabled(): boolean {
    return this.getAgentBaseUrl().length > 0;
  }

  /**
   * Proxy a request to the ghostfolio-agent service with shared-auth headers.
   * Forwards the user's Ghostfolio JWT and user id so the agent uses the same auth.
   */
  public async proxyToAgent({
    method,
    path,
    ghostfolioUserId,
    bearerToken,
    body
  }: {
    method: 'GET' | 'POST';
    path: string;
    ghostfolioUserId: string;
    bearerToken: string;
    body?: unknown;
  }): Promise<{ status: number; data: unknown }> {
    const baseUrl = this.getAgentBaseUrl();
    if (!baseUrl) {
      return {
        status: 503,
        data: { error: 'Agent service is not configured (AGENT_SERVICE_URL).' }
      };
    }

    const url = `${baseUrl.replace(/\/$/, '')}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: bearerToken.startsWith('Bearer ')
        ? bearerToken
        : `Bearer ${bearerToken}`,
      [X_GHOSTFOLIO_USER_ID]: ghostfolioUserId
    };

    const init: RequestInit = { method, headers };
    if (body !== undefined && method === 'POST') {
      init.body = JSON.stringify(body);
    }

    const response = await fetch(url, init);
    let data: unknown;
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      try {
        data = await response.json();
      } catch {
        data = { error: 'Invalid JSON response from agent' };
      }
    } else {
      data = { error: await response.text() };
    }

    return { status: response.status, data };
  }

  /**
   * Proxy a streaming request to the agent's /api/chat/stream endpoint.
   * Pipes the SSE stream from the agent to the Express response.
   */
  public async proxyStreamToAgent({
    path,
    ghostfolioUserId,
    bearerToken,
    body,
    res
  }: {
    path: string;
    ghostfolioUserId: string;
    bearerToken: string;
    body: unknown;
    res: Response;
  }): Promise<void> {
    const baseUrl = this.getAgentBaseUrl();
    if (!baseUrl) {
      res.status(503).json({
        error: 'Agent service is not configured (AGENT_SERVICE_URL).'
      });
      return;
    }

    const url = `${baseUrl.replace(/\/$/, '')}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: bearerToken.startsWith('Bearer ')
        ? bearerToken
        : `Bearer ${bearerToken}`,
      [X_GHOSTFOLIO_USER_ID]: ghostfolioUserId
    };

    const agentRes = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!agentRes.ok) {
      const text = await agentRes.text();
      res
        .status(agentRes.status)
        .json({ error: text || 'Agent request failed' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();
    // Disable Nagle's algorithm for immediate delivery of SSE chunks
    (res as any).socket?.setNoDelay?.(true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nodeStream = Readable.fromWeb(agentRes.body as any);
    nodeStream.pipe(res);
  }

  /**
   * Proxy a streaming request to the agent and yield parsed SSE events.
   * Used by the WebSocket gateway to forward events to the client.
   */
  public async *proxyStreamToAgentEvents({
    path,
    ghostfolioUserId,
    bearerToken,
    body,
    signal
  }: {
    path: string;
    ghostfolioUserId: string;
    bearerToken: string;
    body: unknown;
    signal?: AbortSignal;
  }): AsyncGenerator<Record<string, unknown>> {
    const baseUrl = this.getAgentBaseUrl();
    if (!baseUrl) {
      yield {
        type: 'error',
        message: 'Agent service is not configured (AGENT_SERVICE_URL).'
      };
      return;
    }

    const url = `${baseUrl.replace(/\/$/, '')}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: bearerToken.startsWith('Bearer ')
        ? bearerToken
        : `Bearer ${bearerToken}`,
      [X_GHOSTFOLIO_USER_ID]: ghostfolioUserId
    };

    const agentRes = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal
    });

    if (!agentRes.ok) {
      const text = await agentRes.text();
      yield {
        type: 'error',
        message: text || `Agent request failed (HTTP ${agentRes.status})`
      };
      return;
    }

    if (!agentRes.body) {
      yield { type: 'error', message: 'Streaming response was empty' };
      return;
    }

    const reader = agentRes.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (signal?.aborted) break;

        buffer += decoder.decode(value, { stream: true });

        let separatorIndex = buffer.indexOf('\n\n');
        while (separatorIndex >= 0) {
          const rawEvent = buffer.slice(0, separatorIndex);
          buffer = buffer.slice(separatorIndex + 2);

          const dataPayload = rawEvent
            .split('\n')
            .filter((line) => line.startsWith('data:'))
            .map((line) => line.slice(5).trim())
            .join('\n');

          if (dataPayload) {
            try {
              const parsed = JSON.parse(dataPayload) as Record<string, unknown>;
              yield parsed;
            } catch {
              // Skip malformed events
            }
          }

          separatorIndex = buffer.indexOf('\n\n');
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
