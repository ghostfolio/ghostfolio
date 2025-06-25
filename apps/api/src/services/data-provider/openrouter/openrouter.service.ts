import {
  PROPERTY_API_KEY_OPENROUTER,
  PROPERTY_OPENROUTER_MODEL
} from '@ghostfolio/common/config/properties';

import { Injectable } from '@nestjs/common';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { streamText } from 'ai';

import { PropertyService } from '../../property/property.service';

@Injectable()
export class OpenRouterService {
  public constructor(private readonly propertyService: PropertyService) {}

  public async getCompletion(prompt: string) {
    const openRouterApiKey = await this.propertyService.getByKey(
      PROPERTY_API_KEY_OPENROUTER
    );

    const openRouterModel = await this.propertyService.getByKey(
      PROPERTY_OPENROUTER_MODEL
    );

    const openrouter = createOpenRouter({
      apiKey: openRouterApiKey as string
    });

    return streamText({
      model: openrouter.chat(openRouterModel as string),
      prompt
    });
  }
}
