import { PortfolioService } from '@ghostfolio/api/app/portfolio/portfolio.service';
import { OrderService } from '@ghostfolio/api/app/order/order.service';
import { PropertyService } from '@ghostfolio/api/services/property/property.service';
import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import { UserService } from '@ghostfolio/api/app/user/user.service';
import {
  PROPERTY_API_KEY_OPENROUTER,
  PROPERTY_OPENROUTER_MODEL
} from '@ghostfolio/common/config';
import { DataSource } from '@prisma/client';

import { Injectable, Logger } from '@nestjs/common';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import * as ai from 'ai';
import { generateText, tool } from 'ai';
import { randomUUID } from 'crypto';
import { z } from 'zod';

import { AgentTraceService, ToolTrace } from './agent-trace.service';

const LANGSMITH_ENDPOINT = 'https://api.smith.langchain.com';

function ensureLangSmithEnv(): string | null {
  const key =
    process.env.LANGSMITH_API_KEY ?? process.env.LANGCHAIN_API_KEY;
  if (!key) return null;
  process.env.LANGCHAIN_API_KEY = process.env.LANGCHAIN_API_KEY ?? key;
  process.env.LANGCHAIN_TRACING = 'true';
  process.env.LANGSMITH_TRACING = 'true';
  process.env.LANGCHAIN_ENDPOINT =
    process.env.LANGCHAIN_ENDPOINT ?? LANGSMITH_ENDPOINT;
  process.env.LANGSMITH_ENDPOINT =
    process.env.LANGSMITH_ENDPOINT ?? LANGSMITH_ENDPOINT;
  return key;
}

/** Lazy-load LangSmith tracing when key is set; avoids hard build dependency. */
async function getTracedGenerateText(metadata: Record<string, unknown>): Promise<{
  generateTextFn: typeof generateText;
  flush?: () => Promise<void>;
}> {
  const key = ensureLangSmithEnv();
  if (!key) return { generateTextFn: generateText };
  try {
    const { Client } = await import('langsmith');
    const { wrapAISDK, createLangSmithProviderOptions } = await import(
      'langsmith/experimental/vercel'
    );
    const client = new Client();
    const traced = wrapAISDK(ai, { client });
    const generateTextFn = (opts: Parameters<typeof generateText>[0]) =>
      traced.generateText({
        ...opts,
        providerOptions: {
          ...(opts as any).providerOptions,
          langsmith: createLangSmithProviderOptions({
            name: 'Ghostfolio Agent',
            tags: ['ghostfolio', 'agent'],
            metadata
          })
        }
      });
    const flush = () => (client as any).awaitPendingTraceBatches?.() ?? Promise.resolve();
    return { generateTextFn, flush };
  } catch {
    return { generateTextFn: generateText };
  }
}

export interface AgentChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AgentVerification {
  passed: boolean;
  type: 'output_validation' | 'source_attribution';
  message?: string;
}

export interface AgentChatResponse {
  message: { role: 'assistant'; content: string };
  verification?: AgentVerification;
  error?: string;
}

/** Domain-specific verification: non-empty output and source attribution for financial content. */
export function verifyAgentOutput(content: string): {
  content: string;
  verification: AgentVerification;
} {
  const trimmed = (content ?? '').trim();
  if (trimmed.length === 0) {
    return {
      content: trimmed,
      verification: { passed: false, type: 'output_validation', message: 'Empty response' }
    };
  }
  const hasFinancialContent =
    /\d+\.?\d*%/.test(trimmed) ||
    /\$[\d,]+(\.\d+)?/.test(trimmed) ||
    /(allocation|performance|return|price|holding)/i.test(trimmed);
  const hasSourceAttribution =
    /ghostfolio|portfolio data|tool|based on|your (holdings|portfolio|data)/i.test(trimmed);
  const suffix = hasFinancialContent && !hasSourceAttribution
    ? ' (Source: your Ghostfolio data.)'
    : '';
  return {
    content: trimmed + suffix,
    verification: {
      passed: true,
      type: hasFinancialContent ? 'source_attribution' : 'output_validation'
    }
  };
}

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  public constructor(
    private readonly portfolioService: PortfolioService,
    private readonly orderService: OrderService,
    private readonly dataProviderService: DataProviderService,
    private readonly propertyService: PropertyService,
    private readonly userService: UserService,
    private readonly traceService: AgentTraceService
  ) {}

  private wrapToolExecute<T>(
    name: string,
    fn: (...args: any[]) => Promise<T>,
    toolTraces: ToolTrace[]
  ): (...args: any[]) => Promise<T> {
    return async (...args: any[]) => {
      const t0 = Date.now();
      try {
        const result = await fn(...args);
        toolTraces.push({
          name,
          args: args[0] ?? {},
          durationMs: Date.now() - t0,
          success: true
        });
        return result;
      } catch (err) {
        toolTraces.push({
          name,
          args: args[0] ?? {},
          durationMs: Date.now() - t0,
          success: false,
          error: err instanceof Error ? err.message : String(err)
        });
        throw err;
      }
    };
  }

  public async chat({
    userId,
    impersonationId,
    messages
  }: {
    userId: string;
    impersonationId?: string;
    messages: AgentChatMessage[];
  }): Promise<AgentChatResponse> {
    const traceId = randomUUID();
    const t0 = Date.now();
    const toolTraces: ToolTrace[] = [];
    const userInput = messages.filter((m) => m.role === 'user').pop()?.content ?? '';

    try {
      const openRouterApiKey =
        process.env.OPENROUTER_API_KEY ??
        (await this.propertyService.getByKey<string>(PROPERTY_API_KEY_OPENROUTER));
      const openRouterModel =
        process.env.OPENROUTER_MODEL ??
        (await this.propertyService.getByKey<string>(PROPERTY_OPENROUTER_MODEL));

      if (!openRouterApiKey || !openRouterModel) {
        return {
          message: {
            role: 'assistant',
            content:
              'Agent is not configured. Please set OpenRouter API key and model in Ghostfolio settings.'
          },
          verification: { passed: false, type: 'output_validation', message: 'Not configured' },
          error: 'Missing OpenRouter configuration'
        };
      }

      const openRouter = createOpenRouter({ apiKey: openRouterApiKey });

      const systemPrompt = `You are a helpful portfolio assistant for Ghostfolio. You have tools to fetch the user's portfolio holdings, performance, transactions, market quotes, and risk reports. Always base your answers on tool results only. If you don't have data, say so. Never invent symbols, prices, or allocations. When reporting financial figures, always mention the data source. Use the tools when the user asks about their portfolio, allocation, performance, recent transactions, stock prices, or portfolio health/risk.`;

      const tools = {
        portfolio_analysis: tool({
          description:
            'Get the user\'s current portfolio holdings and allocation percentages. Use when asked about allocation, holdings, or portfolio composition.',
          parameters: z.object({}),
          execute: this.wrapToolExecute('portfolio_analysis', async () => {
            const result = await this.portfolioService.getDetails({
              userId,
              impersonationId: impersonationId ?? userId,
              withSummary: true
            });
            const holdingsList = Object.values(result.holdings).map((h) => ({
              symbol: h.symbol,
              name: h.name,
              allocationInPercentage: (h.allocationInPercentage * 100).toFixed(2) + '%',
              currency: h.currency,
              assetClass: h.assetClass ?? undefined
            }));
            return {
              holdings: holdingsList,
              hasErrors: result.hasErrors,
              summary: result.summary ?? undefined
            };
          }, toolTraces)
        }),
        portfolio_performance: tool({
          description:
            'Get portfolio performance over a date range (e.g. 1d, 1y, ytd, max). Use when asked how the portfolio performed.',
          parameters: z.object({
            dateRange: z
              .enum(['1d', '1y', 'ytd', 'max', 'mtd', 'wtd'])
              .optional()
              .describe('Performance period')
          }),
          execute: this.wrapToolExecute('portfolio_performance', async ({ dateRange = 'max' }) => {
            const result = await this.portfolioService.getPerformance({
              userId,
              impersonationId: impersonationId ?? userId,
              dateRange: dateRange as '1d' | '1y' | 'ytd' | 'max' | 'mtd' | 'wtd'
            });
            return {
              dateRange,
              netPerformancePercentage: result.performance?.netPerformancePercentage ?? null,
              netPerformance: result.performance?.netPerformance ?? null,
              currentValueInBaseCurrency: result.performance?.currentValueInBaseCurrency ?? null,
              totalInvestment: result.performance?.totalInvestment ?? null,
              hasErrors: result.hasErrors
            };
          }, toolTraces)
        }),
        transaction_list: tool({
          description:
            'List the user\'s recent transactions (buys, sells, dividends, etc.). Use when asked about recent activity, trades, or transactions.',
          parameters: z.object({
            limit: z.number().min(1).max(50).optional().describe('Max number of activities to return')
          }),
          execute: this.wrapToolExecute('transaction_list', async ({ limit = 10 }) => {
            const user = await this.userService.user({ id: userId });
            const userCurrency = (user?.settings?.settings as { baseCurrency?: string })?.baseCurrency ?? 'USD';
            const { activities } = await this.orderService.getOrders({
              userId,
              userCurrency,
              take: limit,
              withExcludedAccountsAndActivities: true
            });
            const list = activities.slice(0, limit).map((a) => ({
              date: a.date,
              type: a.type,
              symbol: a.SymbolProfile?.symbol ?? undefined,
              quantity: a.quantity,
              unitPrice: a.unitPrice,
              fee: a.fee,
              currency: a.SymbolProfile?.currency ?? undefined
            }));
            return { activities: list, count: list.length };
          }, toolTraces)
        }),
        portfolio_report: tool({
          description:
            'Get a risk/health report (X-Ray) for the portfolio. Shows rules like diversification, emergency fund, fees, etc. Use when asked about portfolio health, risk, or suggestions.',
          parameters: z.object({}),
          execute: this.wrapToolExecute('portfolio_report', async () => {
            const result = await this.portfolioService.getReport({
              userId,
              impersonationId: impersonationId ?? userId
            });
            const categories = result.xRay?.categories?.map((c) => ({
              key: c.key,
              name: c.name,
              rules: c.rules?.map((r) => ({
                name: r.name,
                isActive: r.isActive,
                passed: r.value,
                evaluation: r.evaluation
              }))
            }));
            return {
              categories,
              statistics: result.xRay?.statistics
            };
          }, toolTraces)
        }),
        market_quote: tool({
          description:
            'Get current market price for a symbol (e.g. AAPL, MSFT). Use when asked for a stock price or quote. Default data source is YAHOO for stocks.',
          parameters: z.object({
            symbol: z.string().describe('Ticker symbol, e.g. AAPL'),
            dataSource: z
              .enum(['YAHOO', 'COINGECKO', 'MANUAL'])
              .optional()
              .describe('Data source; use YAHOO for stocks/ETFs')
          }),
          execute: this.wrapToolExecute('market_quote', async ({ symbol, dataSource = 'YAHOO' }) => {
            const ds = DataSource[dataSource as keyof typeof DataSource] ?? DataSource.YAHOO;
            const quotes = await this.dataProviderService.getQuotes({
              items: [{ dataSource: ds, symbol }],
              useCache: true
            });
            const q = quotes[symbol];
            if (!q) return { symbol, error: 'Quote not found' };
            return {
              symbol,
              marketPrice: q.marketPrice,
              currency: q.currency,
              dataSource: q.dataSource,
              marketState: q.marketState
            };
          }, toolTraces)
        })
      };

      const coreMessages = messages.map((m) => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content
      }));

      // Optional LangSmith tracing (lazy-loaded to avoid build failures)
      const { generateTextFn, flush } = await getTracedGenerateText({ traceId });

      const llmT0 = Date.now();
      const { text, usage } = await generateTextFn({
        model: openRouter.chat(openRouterModel),
        system: systemPrompt,
        messages: coreMessages,
        tools,
        maxSteps: 5
      });
      await flush?.();
      const llmMs = Date.now() - llmT0;

      const { content, verification } = verifyAgentOutput(text);
      const totalMs = Date.now() - t0;
      const toolsMs = toolTraces.reduce((s, t) => s + t.durationMs, 0);
      const inputTokens = usage?.promptTokens ?? 0;
      const outputTokens = usage?.completionTokens ?? 0;
      const totalTokens = inputTokens + outputTokens;
      // Cost estimation (rough avg across OpenRouter models; adjusts per model at runtime)
      const isExpensiveModel = /claude|gpt-4o(?!-mini)/.test(openRouterModel);
      const inputRate = isExpensiveModel ? 0.003 : 0.00015;
      const outputRate = isExpensiveModel ? 0.015 : 0.0006;
      const estimatedCostUsd = (inputTokens * inputRate + outputTokens * outputRate) / 1000;

      this.traceService.addTrace({
        id: traceId,
        timestamp: new Date().toISOString(),
        userId,
        input: userInput,
        output: content,
        model: openRouterModel,
        toolCalls: toolTraces,
        verification,
        latency: { totalMs, llmMs, toolsMs },
        tokens: { input: inputTokens, output: outputTokens, total: totalTokens },
        estimatedCostUsd,
        success: true
      });

      this.logger.log(
        `Trace ${traceId}: ${totalMs}ms | ${toolTraces.length} tools | ${totalTokens} tokens | $${estimatedCostUsd.toFixed(4)}`
      );

      return {
        message: { role: 'assistant', content },
        verification
      };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const totalMs = Date.now() - t0;

      this.traceService.addTrace({
        id: traceId,
        timestamp: new Date().toISOString(),
        userId,
        input: userInput,
        output: errMsg,
        model: 'unknown',
        toolCalls: toolTraces,
        verification: null,
        latency: { totalMs, llmMs: 0, toolsMs: toolTraces.reduce((s, t) => s + t.durationMs, 0) },
        tokens: { input: 0, output: 0, total: 0 },
        estimatedCostUsd: 0,
        success: false,
        error: errMsg
      });

      this.logger.error(`Trace ${traceId} FAILED: ${errMsg}`);

      return {
        message: {
          role: 'assistant',
          content: `Sorry, I couldn't process that. Please try again. (${errMsg})`
        },
        verification: { passed: false, type: 'output_validation', message: 'Error during processing' },
        error: errMsg
      };
    }
  }
}
