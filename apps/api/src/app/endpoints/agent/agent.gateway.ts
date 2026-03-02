import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Server } from 'node:http';
import { WebSocketServer } from 'ws';

import { AgentService } from './agent.service';

const AGENT_WS_PATH = '/api/v1/agent/ws';

export function setupAgentWebSocket(
  httpServer: Server,
  app: INestApplication
): void {
  const agentService = app.get(AgentService);
  const jwtService = app.get(JwtService);

  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (request, socket, head) => {
    const url = request.url ?? '';
    if (!url.startsWith(AGENT_WS_PATH)) {
      socket.destroy();
      return;
    }

    const parsed = new URL(
      url,
      `http://${request.headers.host ?? 'localhost'}`
    );
    const token = parsed.searchParams.get('token');
    if (!token) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    const raw = token.startsWith('Bearer ') ? token.slice(7) : token;
    let userId: string;
    try {
      const payload = jwtService.verify<{ id: string }>(raw);
      userId = payload?.id;
      if (!userId) {
        throw new Error('Missing user id in token');
      }
    } catch {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    const bearerToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request, { userId, bearerToken });
    });
  });

  wss.on(
    'connection',
    (
      ws: import('ws').WebSocket,
      _request: unknown,
      context: { userId: string; bearerToken: string }
    ) => {
      const { userId, bearerToken } = context;
      let abortController: AbortController | null = null;

      ws.on('message', async (data: Buffer | string) => {
        if (ws.readyState !== 1) return; // OPEN

        let msg: {
          type: string;
          conversationHistory?: { role: string; content: string }[];
          message?: string;
        };
        try {
          const raw = typeof data === 'string' ? data : data.toString('utf8');
          msg = JSON.parse(raw) as {
            type: string;
            conversationHistory?: { role: string; content: string }[];
            message?: string;
          };
        } catch {
          ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
          return;
        }

        if (msg.type === 'cancel') {
          abortController?.abort();
          return;
        }

        if (
          msg.type !== 'chat' ||
          !msg.message ||
          !Array.isArray(msg.conversationHistory)
        ) {
          ws.send(
            JSON.stringify({
              type: 'error',
              message: 'Expected { type: "chat", message, conversationHistory }'
            })
          );
          return;
        }

        if (!agentService.isEnabled()) {
          ws.send(
            JSON.stringify({
              type: 'error',
              message: 'Agent service is not configured.'
            })
          );
          return;
        }

        abortController = new AbortController();

        try {
          for await (const event of agentService.proxyStreamToAgentEvents({
            path: '/api/chat/stream',
            ghostfolioUserId: userId,
            bearerToken,
            body: {
              conversationHistory: msg.conversationHistory,
              message: msg.message
            },
            signal: abortController.signal
          })) {
            if (ws.readyState !== 1) break;
            ws.send(JSON.stringify(event));
          }
        } catch (error) {
          const name = (error as Error)?.name;
          if (name === 'AbortError') return;
          const msg = error instanceof Error ? error.message : String(error);
          if (ws.readyState === 1) {
            ws.send(JSON.stringify({ type: 'error', message: msg }));
          }
        } finally {
          abortController = null;
        }
      });

      ws.on('close', () => {
        abortController?.abort();
      });
    }
  );
}
