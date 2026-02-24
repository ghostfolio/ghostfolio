import { OrderService } from '@ghostfolio/api/app/order/order.service';
import { PortfolioService } from '@ghostfolio/api/app/portfolio/portfolio.service';
import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { PropertyService } from '@ghostfolio/api/services/property/property.service';
import {
  PROPERTY_API_KEY_OPENROUTER,
  PROPERTY_OPENROUTER_MODEL
} from '@ghostfolio/common/config';
import { Filter } from '@ghostfolio/common/interfaces';
import type { AiPromptMode } from '@ghostfolio/common/types';

import { Injectable, Logger } from '@nestjs/common';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText, CoreMessage } from 'ai';
import type { ColumnDescriptor } from 'tablemark';

import { getPortfolioHoldingsTool } from './tools/portfolio-holdings.tool';
import { getPortfolioPerformanceTool } from './tools/portfolio-performance.tool';
import { getAccountSummaryTool } from './tools/account-summary.tool';
import { getDividendSummaryTool } from './tools/dividend-summary.tool';
import { getTransactionHistoryTool } from './tools/transaction-history.tool';
import { getLookupMarketDataTool } from './tools/market-data.tool';
import { getExchangeRateTool } from './tools/exchange-rate.tool';
import { getPortfolioReportTool } from './tools/portfolio-report.tool';

const AGENT_SYSTEM_PROMPT = [
  'You are a helpful financial assistant for Ghostfolio, a personal wealth management application.',
  'You help users understand their portfolio, holdings, performance, and financial data.',
  '',
  'IMPORTANT RULES:',
  '1. Only provide information based on actual data from the tools available to you. NEVER make up or hallucinate financial data.',
  '2. When citing specific numbers (prices, percentages, values), they MUST come directly from tool results.',
  '3. If you cannot find the requested information, say so clearly rather than guessing.',
  '4. You are a READ-ONLY assistant. You cannot execute trades, modify portfolios, or make changes to accounts.',
  '5. If asked to perform actions like buying, selling, or transferring assets, politely decline and explain you can only provide information.',
  '6. Include appropriate financial disclaimers when providing analytical or forward-looking commentary.',
  '',
  'DISCLAIMER: This is an AI assistant providing informational responses based on portfolio data.',
  'This is not financial advice. Always consult with a qualified financial advisor before making investment decisions.'
].join('\n');

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  private static readonly HOLDINGS_TABLE_COLUMN_DEFINITIONS: ({
    key:
      | 'ALLOCATION_PERCENTAGE'
      | 'ASSET_CLASS'
      | 'ASSET_SUB_CLASS'
      | 'CURRENCY'
      | 'NAME'
      | 'SYMBOL';
  } & ColumnDescriptor)[] = [
    { key: 'NAME', name: 'Name' },
    { key: 'SYMBOL', name: 'Symbol' },
    { key: 'CURRENCY', name: 'Currency' },
    { key: 'ASSET_CLASS', name: 'Asset Class' },
    { key: 'ASSET_SUB_CLASS', name: 'Asset Sub Class' },
    {
      align: 'right',
      key: 'ALLOCATION_PERCENTAGE',
      name: 'Allocation in Percentage'
    }
  ];

  public constructor(
    private readonly dataProviderService: DataProviderService,
    private readonly exchangeRateDataService: ExchangeRateDataService,
    private readonly orderService: OrderService,
    private readonly portfolioService: PortfolioService,
    private readonly prismaService: PrismaService,
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

    const holdingsTableColumns: ColumnDescriptor[] =
      AiService.HOLDINGS_TABLE_COLUMN_DEFINITIONS.map(({ align, name }) => {
        return { name, align: align ?? 'left' };
      });

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
          name: label,
          symbol
        }) => {
          return AiService.HOLDINGS_TABLE_COLUMN_DEFINITIONS.reduce(
            (row, { key, name }) => {
              switch (key) {
                case 'ALLOCATION_PERCENTAGE':
                  row[name] = `${(allocationInPercentage * 100).toFixed(3)}%`;
                  break;

                case 'ASSET_CLASS':
                  row[name] = assetClass ?? '';
                  break;

                case 'ASSET_SUB_CLASS':
                  row[name] = assetSubClass ?? '';
                  break;

                case 'CURRENCY':
                  row[name] = currency;
                  break;

                case 'NAME':
                  row[name] = label;
                  break;

                case 'SYMBOL':
                  row[name] = symbol;
                  break;

                default:
                  row[name] = '';
                  break;
              }

              return row;
            },
            {} as Record<string, string>
          );
        }
      );

    // Dynamic import to load ESM module from CommonJS context
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const dynamicImport = new Function('s', 'return import(s)') as (
      s: string
    ) => Promise<typeof import('tablemark')>;
    const { tablemark } = await dynamicImport('tablemark');

    const holdingsTableString = tablemark(holdingsTableRows, {
      columns: holdingsTableColumns
    });

    if (mode === 'portfolio') {
      return holdingsTableString;
    }

    return [
      `You are a neutral financial assistant. Please analyze the following investment portfolio (base currency being ${userCurrency}) in simple words.`,
      holdingsTableString,
      "Structure your answer with these sections:",
      "Overview: Briefly summarize the portfolio composition and allocation rationale.",
      "Risk Assessment: Identify potential risks, including market volatility, concentration, and sectoral imbalances.",
      "Advantages: Highlight strengths, focusing on growth potential, diversification, or other benefits.",
      "Disadvantages: Point out weaknesses, such as overexposure or lack of defensive assets.",
      "Target Group: Discuss who this portfolio might suit (e.g., risk tolerance, investment goals, life stages, and experience levels).",
      "Optimization Ideas: Offer ideas to complement the portfolio, ensuring they are constructive and neutral in tone.",
      "Conclusion: Provide a concise summary highlighting key insights.",
      `Provide your answer in the following language: ${languageCode}.`
    ].join("\n");
  }

  public async agentChat({
    conversationHistory,
    message,
    impersonationId,
    userCurrency,
    userId
  }: {
    conversationHistory?: CoreMessage[];
    message: string;
    impersonationId?: string;
    userCurrency: string;
    userId: string;
  }) {
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

    if (!anthropicApiKey) {
      throw new Error(
        "ANTHROPIC_API_KEY is not configured. Please set the environment variable."
      );
    }

    const anthropic = createAnthropic({ apiKey: anthropicApiKey });

    const tools = {
      get_portfolio_holdings: getPortfolioHoldingsTool({
        portfolioService: this.portfolioService,
        userId,
        impersonationId
      }),
      get_portfolio_performance: getPortfolioPerformanceTool({
        dataProviderService: this.dataProviderService,
        prismaService: this.prismaService,
        userId
      }),
      get_account_summary: getAccountSummaryTool({
        portfolioService: this.portfolioService,
        userId
      }),
      get_dividend_summary: getDividendSummaryTool({
        orderService: this.orderService,
        portfolioService: this.portfolioService,
        userId,
        userCurrency
      }),
      get_transaction_history: getTransactionHistoryTool({
        orderService: this.orderService,
        userId,
        userCurrency
      }),
      lookup_market_data: getLookupMarketDataTool({
        dataProviderService: this.dataProviderService,
        prismaService: this.prismaService
      }),
      get_exchange_rate: getExchangeRateTool({
        exchangeRateDataService: this.exchangeRateDataService
      }),
      get_portfolio_report: getPortfolioReportTool({
        portfolioService: this.portfolioService,
        userId,
        impersonationId
      })
    };

    const messages: CoreMessage[] = [
      ...(conversationHistory ?? []),
      { role: "user" as const, content: message }
    ];

    try {
      const result = await generateText({
        model: anthropic("claude-sonnet-4-20250514"),
        system: AGENT_SYSTEM_PROMPT,
        tools,
        toolChoice: "auto",
        messages,
        maxSteps: 5
      });

      const toolCalls = result.steps
        .flatMap((step) => step.toolCalls ?? [])
        .map((tc) => ({
          toolName: tc.toolName,
          args: tc.args
        }));

      const updatedHistory: CoreMessage[] = [
        ...messages,
        { role: "assistant" as const, content: result.text }
      ];

      let responseText = result.text;
      const containsNumbers = /\$[\d,]+|\d+\.\d{2}%|\d{1,3}(,\d{3})+/.test(
        responseText
      );

      if (containsNumbers) {
        responseText +=
          "\n\n*Note: All figures shown are based on your actual portfolio data. This is informational only and not financial advice.*";
      }

      return {
        response: responseText,
        toolCalls,
        conversationHistory: updatedHistory
      };
    } catch (error) {
      this.logger.error("Agent chat error:", error);

      if (error?.message?.includes("API key")) {
        return {
          response:
            "The AI service is not properly configured. Please check your API key settings.",
          toolCalls: [],
          conversationHistory: messages
        };
      }

      return {
        response:
          "I encountered an issue processing your request. Please try again later.",
        toolCalls: [],
        conversationHistory: messages
      };
    }
  }
}
