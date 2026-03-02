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

import { createAnthropic } from '@ai-sdk/anthropic';
import { Injectable, Logger } from '@nestjs/common';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText, streamText, CoreMessage } from 'ai';
import { randomUUID } from 'crypto';
import type { ColumnDescriptor } from 'tablemark';

import { NewsService } from '../news/news.service';
import { getAccountSummaryTool } from './tools/account-summary.tool';
import { getDividendSummaryTool } from './tools/dividend-summary.tool';
import { getExchangeRateTool } from './tools/exchange-rate.tool';
import { getLookupMarketDataTool } from './tools/market-data.tool';
import { getPortfolioHoldingsTool } from './tools/portfolio-holdings.tool';
import { getPortfolioNewsTool } from './tools/portfolio-news.tool';
import { getPortfolioPerformanceTool } from './tools/portfolio-performance.tool';
import { getPortfolioReportTool } from './tools/portfolio-report.tool';
import { getTransactionHistoryTool } from './tools/transaction-history.tool';
import { runVerificationChecks } from './verification';

function getAgentSystemPrompt() {
  return [
    `Today's date is ${new Date().toISOString().split('T')[0]}.`,
    '',
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
    '7. When the user asks about performance for a specific time period, pass the appropriate dateRange parameter: "ytd" for this year, "1y" for past year, "5y" for 5 years, "mtd" for this month, "wtd" for this week, "1d" for today. Use "max" for all-time or when no specific period is mentioned.',
    '',
    'DISCLAIMER: This is an AI assistant providing informational responses based on portfolio data.',
    'This is not financial advice. Always consult with a qualified financial advisor before making investment decisions.'
  ].join('\n');
}

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
    private readonly newsService: NewsService,
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
      'Structure your answer with these sections:',
      'Overview: Briefly summarize the portfolio composition and allocation rationale.',
      'Risk Assessment: Identify potential risks, including market volatility, concentration, and sectoral imbalances.',
      'Advantages: Highlight strengths, focusing on growth potential, diversification, or other benefits.',
      'Disadvantages: Point out weaknesses, such as overexposure or lack of defensive assets.',
      'Target Group: Discuss who this portfolio might suit (e.g., risk tolerance, investment goals, life stages, and experience levels).',
      'Optimization Ideas: Offer ideas to complement the portfolio, ensuring they are constructive and neutral in tone.',
      'Conclusion: Provide a concise summary highlighting key insights.',
      `Provide your answer in the following language: ${languageCode}.`
    ].join('\n');
  }

  private buildAgentConfig({
    userId,
    impersonationId,
    userCurrency
  }: {
    userId: string;
    impersonationId?: string;
    userCurrency: string;
  }) {
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

    if (!anthropicApiKey) {
      throw new Error(
        'ANTHROPIC_API_KEY is not configured. Please set the environment variable.'
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
      }),
      get_portfolio_news: getPortfolioNewsTool({
        newsService: this.newsService
      })
    };

    return { anthropic, tools };
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
    const { anthropic, tools } = this.buildAgentConfig({
      userId,
      impersonationId,
      userCurrency
    });

    const messages: CoreMessage[] = [
      ...(conversationHistory ?? []),
      { role: 'user' as const, content: message }
    ];

    const traceId = randomUUID();

    try {
      const result = await generateText({
        model: anthropic('claude-haiku-4-5-20251001'),
        system: getAgentSystemPrompt(),
        tools,
        toolChoice: 'auto',
        messages,
        maxSteps: 10,
        experimental_telemetry: {
          isEnabled: true,
          functionId: 'ghostfolio-ai-agent',
          metadata: { userId, traceId }
        }
      });

      const toolCalls = result.steps
        .flatMap((step) => step.toolCalls ?? [])
        .map((tc) => ({
          toolName: tc.toolName,
          args: tc.args
        }));

      const toolResults = result.steps.flatMap(
        (step) => step.toolResults ?? []
      );

      const updatedHistory: CoreMessage[] = [
        ...messages,
        { role: 'assistant' as const, content: result.text }
      ];

      // Run verification checks (disclaimer, hallucination detection, scope validation)
      const { responseText, checks } = runVerificationChecks({
        responseText: result.text,
        toolResults,
        toolCalls
      });

      return {
        response: responseText,
        toolCalls,
        verificationChecks: checks,
        conversationHistory: updatedHistory,
        traceId
      };
    } catch (error) {
      this.logger.error('Agent chat error:', error);

      if (error?.message?.includes('API key')) {
        return {
          response:
            'The AI service is not properly configured. Please check your API key settings.',
          toolCalls: [],
          conversationHistory: messages
        };
      }

      return {
        response:
          'I encountered an issue processing your request. Please try again later.',
        toolCalls: [],
        conversationHistory: messages
      };
    }
  }

  public async agentChatStream({
    conversationHistory,
    message,
    impersonationId,
    userCurrency,
    userId,
    onChunk,
    onDone,
    onError
  }: {
    conversationHistory?: CoreMessage[];
    message: string;
    impersonationId?: string;
    userCurrency: string;
    userId: string;
    onChunk: (text: string) => void;
    onDone: (metadata: {
      response: string;
      toolCalls: any[];
      verificationChecks: any[];
      conversationHistory: CoreMessage[];
      traceId: string;
    }) => void;
    onError: (error: string) => void;
  }) {
    const messages: CoreMessage[] = [
      ...(conversationHistory ?? []),
      { role: 'user' as const, content: message }
    ];

    const traceId = randomUUID();

    try {
      const { anthropic, tools } = this.buildAgentConfig({
        userId,
        impersonationId,
        userCurrency
      });

      const result = streamText({
        model: anthropic('claude-haiku-4-5-20251001'),
        system: getAgentSystemPrompt(),
        tools,
        toolChoice: 'auto',
        messages,
        maxSteps: 10,
        experimental_telemetry: {
          isEnabled: true,
          functionId: 'ghostfolio-ai-agent-stream',
          metadata: { userId, traceId }
        }
      });

      let fullText = '';

      for await (const chunk of result.textStream) {
        fullText += chunk;
        onChunk(chunk);
      }

      const stepsResult = await result.steps;

      const toolCalls = stepsResult
        .flatMap((step) => step.toolCalls ?? [])
        .map((tc) => ({
          toolName: tc.toolName,
          args: tc.args
        }));

      const toolResults = stepsResult.flatMap((step) => step.toolResults ?? []);

      const { responseText, checks } = runVerificationChecks({
        responseText: fullText,
        toolResults,
        toolCalls
      });

      // If verification added extra text (e.g. disclaimer), send the difference
      if (responseText.length > fullText.length) {
        onChunk(responseText.slice(fullText.length));
      }

      const updatedHistory: CoreMessage[] = [
        ...messages,
        { role: 'assistant' as const, content: responseText }
      ];

      onDone({
        response: responseText,
        toolCalls,
        verificationChecks: checks,
        conversationHistory: updatedHistory,
        traceId
      });
    } catch (error) {
      this.logger.error('Agent stream error:', error);
      onError(
        error?.message?.includes('API key')
          ? 'The AI service is not properly configured.'
          : 'I encountered an issue processing your request.'
      );
    }
  }

  public async submitFeedback({
    traceId,
    value,
    userId
  }: {
    traceId: string;
    value: number;
    userId: string;
  }) {
    const langfuseSecretKey = process.env.LANGFUSE_SECRET_KEY;
    const langfusePublicKey = process.env.LANGFUSE_PUBLIC_KEY;
    const langfuseBaseUrl =
      process.env.LANGFUSE_BASEURL || 'https://cloud.langfuse.com';

    if (!langfuseSecretKey || !langfusePublicKey) {
      this.logger.warn('Langfuse keys not configured — feedback not recorded');
      return { success: false, reason: 'Langfuse not configured' };
    }

    try {
      const credentials = Buffer.from(
        `${langfusePublicKey}:${langfuseSecretKey}`
      ).toString('base64');

      const res = await fetch(`${langfuseBaseUrl}/api/public/scores`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${credentials}`
        },
        body: JSON.stringify({
          traceId,
          name: 'user-feedback',
          value,
          comment: value === 1 ? 'thumbs up' : 'thumbs down',
          source: 'API',
          metadata: { userId }
        })
      });

      if (!res.ok) {
        const errorBody = await res.text();
        this.logger.warn(
          `Langfuse score API error: ${res.status} ${errorBody}`
        );
        return { success: false, reason: `Langfuse API error: ${res.status}` };
      }

      this.logger.log(`Feedback recorded: traceId=${traceId} value=${value}`);
      return { success: true };
    } catch (error) {
      this.logger.error('Failed to submit feedback to Langfuse:', error);
      return { success: false, reason: 'Failed to contact Langfuse' };
    }
  }
}
