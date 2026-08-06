import { PropertyService } from '@ghostfolio/api/services/property/property.service';
import {
  PROPERTY_API_KEY_OPENROUTER,
  PROPERTY_OPENROUTER_MODEL
} from '@ghostfolio/common/config';

import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import type { LanguageModel } from 'ai';

@Injectable()
export class AiModelService {
  public constructor(private readonly propertyService: PropertyService) {}

  public async getModel(): Promise<LanguageModel> {
    const [apiKey, model] = await Promise.all([
      this.propertyService.getByKey<string>(PROPERTY_API_KEY_OPENROUTER),
      this.propertyService.getByKey<string>(PROPERTY_OPENROUTER_MODEL)
    ]);
    const normalizedApiKey = apiKey?.trim();
    const normalizedModel = model?.trim();

    if (!normalizedApiKey || !normalizedModel) {
      throw new ServiceUnavailableException('AI service is not configured');
    }

    return createOpenRouter({ apiKey: normalizedApiKey }).chat(normalizedModel);
  }
}
