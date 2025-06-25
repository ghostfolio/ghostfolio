import { PortfolioService } from '@ghostfolio/api/app/portfolio/portfolio.service';
import { Filter } from '@ghostfolio/common/interfaces';
import type { AiPromptMode } from '@ghostfolio/common/types';

import { Injectable } from '@nestjs/common';

@Injectable()
export class AiService {
  public constructor(private readonly portfolioService: PortfolioService) {}

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

    const holdingsTable = [
      '| Name | Symbol | Currency | Asset Class | Asset Sub Class | Allocation in Percentage |',
      '| --- | --- | --- | --- | --- | --- |',
      ...Object.values(holdings)
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
            return `| ${name} | ${symbol} | ${currency} | ${assetClass} | ${assetSubClass} | ${(allocationInPercentage * 100).toFixed(3)}% |`;
          }
        )
    ];

    if (mode === 'portfolio') {
      return holdingsTable.join('\n');
    }

    return [
      `You are a neutral financial assistant. Please analyze the following investment portfolio (base currency being ${userCurrency}) in simple words.`,
      ...holdingsTable,
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
