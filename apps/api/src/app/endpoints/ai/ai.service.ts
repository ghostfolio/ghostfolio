import {
  PROPERTY_API_KEY_OPENROUTER,
  PROPERTY_OPENROUTER_MODEL
} from '@ghostfolio/common/config';
import { Filter } from '@ghostfolio/common/interfaces';
import type { AiPromptMode } from '@ghostfolio/common/types';

import { Injectable } from '@nestjs/common';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText } from 'ai';

import { PropertyService } from '../../../services/property/property.service';
import { PortfolioService } from '../../portfolio/portfolio.service';

@Injectable()
export class AiService {
  public constructor(
    private readonly portfolioService: PortfolioService,
    private readonly propertyService: PropertyService
  ) {}

  public async generateText({ prompt }: { prompt: string }) {
    const openRouterApiKey = await this.propertyService.getByKey<string>(
      PROPERTY_API_KEY_OPENROUTER
    );

    const openRouterModel = await this.propertyService.getByKey<string>(
      PROPERTY_OPENROUTER_MODEL
    );

    const openRouterService = createOpenRouter({
      apiKey: openRouterApiKey
    });

    return generateText({
      prompt,
      model: openRouterService.chat(openRouterModel)
    });
  }

  public async getPrompt({
    filters,
    impersonationId,
    languageCode,
    mode,
    userCurrency,
    userId
  }: {
    filters?: Filter[];
    impersonationId: string;
    languageCode: string;
    mode: AiPromptMode;
    userCurrency: string;
    userId: string;
  }) {
    const { holdings } = await this.portfolioService.getDetails({
      filters,
      impersonationId,
      userId
    });

    // Build rows for tablemark
    const rows = Object.values(holdings)
      .sort((a, b) => b.allocationInPercentage - a.allocationInPercentage)
      .map(
        ({
          allocationInPercentage,
          assetClass,
          assetSubClass,
          currency,
          name,
          symbol
        }) => {
          return {
            Name: name,
            Symbol: symbol,
            Currency: currency,
            'Asset Class': assetClass,
            'Asset Sub Class': assetSubClass,
            'Allocation in Percentage': `${(allocationInPercentage * 100).toFixed(3)}%`
          };
        }
      );

    // Render Markdown table using tablemark, with safe fallback
    let holdingsTableString = '';
    try {
      const tablemarkModule: any = await import('tablemark');
      const tablemark = tablemarkModule?.default ?? tablemarkModule;
      holdingsTableString = tablemark(rows, {
        columns: [
          { name: 'Name' },
          { name: 'Symbol' },
          { name: 'Currency' },
          { name: 'Asset Class' },
          { name: 'Asset Sub Class' },
          { name: 'Allocation in Percentage', align: 'right' }
        ]
      });
    } catch {
      // Fallback to manual rendering if tablemark is unavailable at runtime
      const manual = [
        '| Name | Symbol | Currency | Asset Class | Asset Sub Class | Allocation in Percentage |',
        '| --- | --- | --- | --- | --- | --- |',
        ...rows.map(
          (r) =>
            `| ${r['Name']} | ${r['Symbol']} | ${r['Currency']} | ${r['Asset Class']} | ${r['Asset Sub Class']} | ${r['Allocation in Percentage']} |`
        )
      ];
      holdingsTableString = manual.join('\n');
    }

    if (mode === 'portfolio') {
      return holdingsTableString;
    }

    return [
      `You are a neutral financial assistant. Please analyze the following investment portfolio (base currency being ${userCurrency}) in simple words.`,
      holdingsTableString,
      'Structure your answer with these sections:',
      'Overview: Briefly summarize the portfolio’s composition and allocation rationale.',
      'Risk Assessment: Identify potential risks, including market volatility, concentration, and sectoral imbalances.',
      'Advantages: Highlight strengths, focusing on growth potential, diversification, or other benefits.',
      'Disadvantages: Point out weaknesses, such as overexposure or lack of defensive assets.',
      'Target Group: Discuss who this portfolio might suit (e.g., risk tolerance, investment goals, life stages, and experience levels).',
      'Optimization Ideas: Offer ideas to complement the portfolio, ensuring they are constructive and neutral in tone.',
      'Conclusion: Provide a concise summary highlighting key insights.',
      `Provide your answer in the following language: ${languageCode}.`
    ].join('\n');
  }
}
