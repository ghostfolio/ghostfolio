import {
  PROPERTY_API_KEY_OPENROUTER,
  PROPERTY_OPENROUTER_MODEL
} from '@ghostfolio/common/config';
import { permissions } from '@ghostfolio/common/permissions';

import { InfoService } from './info.service';

describe('InfoService', () => {
  const createService = ({
    openRouterApiKey,
    openRouterModel
  }: {
    openRouterApiKey?: string;
    openRouterModel?: string;
  }) => {
    const propertyValues: Record<string, unknown> = {
      [PROPERTY_API_KEY_OPENROUTER]: openRouterApiKey,
      [PROPERTY_OPENROUTER_MODEL]: openRouterModel
    };

    const propertyService = {
      getByKey: jest.fn(async (key: string) => propertyValues[key]),
      isUserSignupEnabled: jest.fn(async () => false)
    };

    const service = new InfoService(
      {
        getBenchmarkAssetProfiles: jest.fn(async () => [])
      } as never,
      {
        get: jest.fn(() => false)
      } as never,
      {} as never,
      {
        getCurrencies: jest.fn(() => [])
      } as never,
      {
        sign: jest.fn()
      } as never,
      {} as never,
      propertyService as never,
      {} as never,
      {
        getSubscriptionOffer: jest.fn(async () => undefined)
      } as never,
      {} as never
    );

    return { propertyService, service };
  };

  it('exposes the configured model and enables AI chat without exposing the key', async () => {
    const { service } = createService({
      openRouterApiKey: ' secret ',
      openRouterModel: ' openai/gpt-4.1-mini '
    });

    const info = await service.get();

    expect(info.aiChatModel).toBe('openai/gpt-4.1-mini');
    expect(info.globalPermissions).toContain(permissions.enableAiChat);
    expect(JSON.stringify(info)).not.toContain('secret');
  });

  it.each([
    { openRouterApiKey: undefined, openRouterModel: 'openai/gpt-4.1-mini' },
    { openRouterApiKey: 'secret', openRouterModel: undefined },
    { openRouterApiKey: '   ', openRouterModel: 'openai/gpt-4.1-mini' },
    { openRouterApiKey: 'secret', openRouterModel: '   ' }
  ])(
    'keeps AI chat disabled when the provider configuration is incomplete',
    async (configuration) => {
      const { service } = createService(configuration);

      const info = await service.get();

      expect(info.aiChatModel).toBeUndefined();
      expect(info.globalPermissions).not.toContain(permissions.enableAiChat);
    }
  );
});
