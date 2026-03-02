import type { RequestWithUser } from '@ghostfolio/common/types';

import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';

describe('AgentController', () => {
  const makeRes = () => {
    const response = {
      json: jest.fn(),
      status: jest.fn()
    };
    response.status.mockReturnValue(response);
    return response;
  };

  it('returns 503 for auth status when agent service is disabled', async () => {
    const request = {
      headers: {
        authorization: 'Bearer jwt-token'
      },
      user: {
        id: 'user-1'
      }
    } as unknown as RequestWithUser;

    const agentService = {
      isEnabled: jest.fn().mockReturnValue(false),
      proxyToAgent: jest.fn()
    } as unknown as AgentService;

    const controller = new AgentController(agentService, request);
    const res = makeRes();

    await controller.getAuthStatus(res as any);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Agent service is not configured.'
    });
    expect(agentService.proxyToAgent).not.toHaveBeenCalled();
  });

  it('proxies chat request with user id and bearer token', async () => {
    const request = {
      headers: {
        authorization: 'Bearer jwt-token'
      },
      user: {
        id: 'user-1'
      }
    } as unknown as RequestWithUser;

    const agentService = {
      isEnabled: jest.fn().mockReturnValue(true),
      proxyToAgent: jest.fn().mockResolvedValue({
        status: 200,
        data: { answer: 'done' }
      })
    } as unknown as AgentService;

    const controller = new AgentController(agentService, request);
    const res = makeRes();
    const body = { message: 'hello' };

    await controller.chat(body, res as any);

    expect(agentService.proxyToAgent).toHaveBeenCalledWith({
      method: 'POST',
      path: '/api/chat',
      ghostfolioUserId: 'user-1',
      bearerToken: 'Bearer jwt-token',
      body
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ answer: 'done' });
  });
});
