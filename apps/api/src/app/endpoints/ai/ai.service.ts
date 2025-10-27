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
import { ColumnDescriptor } from 'tablemark';

const tablemark = require('tablemark').default;

// Column definitions for holdings table
const HOLDINGS_TABLE_COLUMNS: ({ key: string } & ColumnDescriptor)[] = [
  { key: 'CURRENCY', name: 'Currency' },
  { key: 'NAME', name: 'Name' },
  { key: 'SYMBOL', name: 'Symbol' },
  { key: 'ASSET_CLASS', name: 'Asset Class' },
  {
    align: 'right',
    key: 'ALLOCATION_PERCENTAGE',
    name: 'Allocation in Percentage'
  },
  { key: 'ASSET_SUB_CLASS', name: 'Asset Sub Class' }
];

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

    const holdingsTableColumns: ColumnDescriptor[] = HOLDINGS_TABLE_COLUMNS.map(
      ({ align, name }) => {
        return { name, align: align ?? 'left' };
      }
    );

    const holdingsTableRows = Object.values(holdings)
      .sort((a, b) => {
        return b.allocationInPercentage - a.allocationInPercentage;
      })
      .map((holding) => {
        return HOLDINGS_TABLE_COLUMNS.reduce(
          (row, { key, name }) => {
            switch (key) {
              case 'CURRENCY':
                row[name] = holding.currency;
                break;
              case 'NAME':
                row[name] = holding.name;
                break;
              case 'SYMBOL':
                row[name] = holding.symbol;
                break;
              case 'ASSET_CLASS':
                row[name] = holding.assetClass ?? '';
                break;
              case 'ALLOCATION_PERCENTAGE':
                row[name] =
                  `${(holding.allocationInPercentage * 100).toFixed(3)}%`;
                break;
              case 'ASSET_SUB_CLASS':
                row[name] = holding.assetSubClass ?? '';
                break;
              default:
                row[name] = '';
                break;
            }
            return row;
          },
          {} as Record<string, string>
        );
      });

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
