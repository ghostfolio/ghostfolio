import { PortfolioService } from '@ghostfolio/api/app/portfolio/portfolio.service';
import { PropertyService } from '@ghostfolio/api/services/property/property.service';
import {
  PROPERTY_API_KEY_OPENROUTER,
  PROPERTY_OPENROUTER_MODEL
} from '@ghostfolio/common/config';
import { Filter } from '@ghostfolio/common/interfaces';
import type { AiPromptMode } from '@ghostfolio/common/types';

import { Injectable } from '@nestjs/common';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText } from 'ai';
import tablemark from 'tablemark';
import { ColumnDescriptor } from 'tablemark';

// Column name constants for holdings table
const HOLDINGS_TABLE_COLUMNS = {
  CURRENCY: 'Currency',
  NAME: 'Name',
  SYMBOL: 'Symbol',
  ASSET_CLASS: 'Asset Class',
  ALLOCATION_PERCENTAGE: 'Allocation in Percentage',
  ASSET_SUB_CLASS: 'Asset Sub Class'
} as const;

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

    const holdingsTableColumns: ColumnDescriptor[] = [
      { name: HOLDINGS_TABLE_COLUMNS.CURRENCY },
      { name: HOLDINGS_TABLE_COLUMNS.NAME },
      { name: HOLDINGS_TABLE_COLUMNS.SYMBOL },
      { name: HOLDINGS_TABLE_COLUMNS.ASSET_CLASS },
      { align: 'right', name: HOLDINGS_TABLE_COLUMNS.ALLOCATION_PERCENTAGE },
      { name: HOLDINGS_TABLE_COLUMNS.ASSET_SUB_CLASS }
    ];

    const holdingsTableRows = Object.values(holdings)
      .sort((a, b) => {
        return b.allocationInPercentage - a.allocationInPercentage;
      })
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
            [HOLDINGS_TABLE_COLUMNS.CURRENCY]: currency,
            [HOLDINGS_TABLE_COLUMNS.NAME]: name,
            [HOLDINGS_TABLE_COLUMNS.SYMBOL]: symbol,
            [HOLDINGS_TABLE_COLUMNS.ASSET_CLASS]: assetClass ?? '',
            [HOLDINGS_TABLE_COLUMNS.ALLOCATION_PERCENTAGE]: `${(allocationInPercentage * 100).toFixed(3)}%`,
            [HOLDINGS_TABLE_COLUMNS.ASSET_SUB_CLASS]: assetSubClass ?? ''
          };
        }
      );

    const holdingsTableString = tablemark.default(holdingsTableRows, {
      columns: holdingsTableColumns
    });

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
