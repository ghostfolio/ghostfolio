import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';

import { AgentService } from './agent.service';

describe('AgentService', () => {
  let service: AgentService;
  let configurationService: Pick<ConfigurationService, 'get'>;

  beforeEach(() => {
    configurationService = {
      get: jest.fn()
    };

    service = new AgentService(configurationService as ConfigurationService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns trimmed agent base URL', () => {
    (configurationService.get as jest.Mock).mockReturnValue(
      '  http://localhost:3334/  '
    );

    expect(service.getAgentBaseUrl()).toBe('http://localhost:3334/');
  });

  it('detects when the agent service is disabled', () => {
    (configurationService.get as jest.Mock).mockReturnValue('   ');

    expect(service.isEnabled()).toBe(false);
  });

  it('returns 503 when AGENT_SERVICE_URL is missing', async () => {
    (configurationService.get as jest.Mock).mockReturnValue('');

    await expect(
      service.proxyToAgent({
        method: 'GET',
        path: '/api/auth/status',
        ghostfolioUserId: 'user-1',
        bearerToken: 'Bearer abc'
      })
    ).resolves.toEqual({
      status: 503,
      data: {
        error: 'Agent service is not configured (AGENT_SERVICE_URL).'
      }
    });
  });

  it('forwards auth and user-id headers for POST requests', async () => {
    (configurationService.get as jest.Mock).mockReturnValue(
      'http://localhost:3334'
    );

    const json = { answer: 'ok' };
    const fetchSpy = jest.spyOn(global, 'fetch' as any).mockResolvedValue({
      headers: {
        get: () => 'application/json'
      },
      json: async () => json,
      status: 200
    } as unknown as Response);

    const payload = { message: 'hello' };

    await expect(
      service.proxyToAgent({
        method: 'POST',
        path: '/api/chat',
        ghostfolioUserId: 'user-123',
        bearerToken: 'token-without-prefix',
        body: payload
      })
    ).resolves.toEqual({ status: 200, data: json });

    expect(fetchSpy).toHaveBeenCalledWith('http://localhost:3334/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token-without-prefix',
        'x-ghostfolio-user-id': 'user-123'
      },
      body: JSON.stringify(payload)
    });
  });
});
