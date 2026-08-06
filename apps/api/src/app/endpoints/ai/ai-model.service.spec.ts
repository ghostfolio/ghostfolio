import { PropertyService } from '@ghostfolio/api/services/property/property.service';
import {
  PROPERTY_API_KEY_OPENROUTER,
  PROPERTY_OPENROUTER_MODEL
} from '@ghostfolio/common/config';

import { ServiceUnavailableException } from '@nestjs/common';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';

import { AiModelService } from './ai-model.service';

jest.mock('@openrouter/ai-sdk-provider', () => ({
  createOpenRouter: jest.fn()
}));

describe('AiModelService', () => {
  let chat: jest.Mock;
  let propertyService: { getByKey: jest.Mock };
  let service: AiModelService;

  beforeEach(() => {
    chat = jest.fn().mockReturnValue({ modelId: 'model-adapter' });
    propertyService = { getByKey: jest.fn() };
    service = new AiModelService(propertyService as unknown as PropertyService);
    jest.mocked(createOpenRouter).mockReturnValue({ chat } as never);
    jest.clearAllMocks();
  });

  it('trims configured values before creating the model adapter', async () => {
    propertyService.getByKey.mockImplementation((key) => {
      return key === PROPERTY_API_KEY_OPENROUTER
        ? Promise.resolve('  api-key  ')
        : Promise.resolve('  provider/model  ');
    });

    await expect(service.getModel()).resolves.toEqual({
      modelId: 'model-adapter'
    });
    expect(createOpenRouter).toHaveBeenCalledWith({ apiKey: 'api-key' });
    expect(chat).toHaveBeenCalledWith('provider/model');
  });

  it.each([
    ['missing API key', undefined, 'provider/model'],
    ['blank API key', '   ', 'provider/model'],
    ['missing model', 'api-key', undefined],
    ['blank model', 'api-key', '\n\t']
  ])('fails predictably for a %s', async (_label, apiKey, model) => {
    propertyService.getByKey.mockImplementation((key) => {
      return key === PROPERTY_API_KEY_OPENROUTER
        ? Promise.resolve(apiKey)
        : Promise.resolve(model);
    });

    await expect(service.getModel()).rejects.toEqual(
      new ServiceUnavailableException('AI service is not configured')
    );
    expect(createOpenRouter).not.toHaveBeenCalled();
    expect(chat).not.toHaveBeenCalled();
  });

  it('reads the API key and model properties', async () => {
    propertyService.getByKey
      .mockResolvedValueOnce('api-key')
      .mockResolvedValueOnce('provider/model');

    await service.getModel();

    expect(propertyService.getByKey).toHaveBeenCalledTimes(2);
    expect(propertyService.getByKey).toHaveBeenNthCalledWith(
      1,
      PROPERTY_API_KEY_OPENROUTER
    );
    expect(propertyService.getByKey).toHaveBeenNthCalledWith(
      2,
      PROPERTY_OPENROUTER_MODEL
    );
  });
});
