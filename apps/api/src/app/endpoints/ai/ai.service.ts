import { PortfolioService } from '@ghostfolio/api/app/portfolio/portfolio.service';
import { RedisCacheService } from '@ghostfolio/api/app/redis-cache/redis-cache.service';
import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
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
import { randomUUID } from 'node:crypto';
import type { ColumnDescriptor } from 'tablemark';

import { AiAgentChatResponse, AiAgentToolCall } from './ai-agent.interfaces';
import {
  AI_AGENT_MEMORY_MAX_TURNS,
  addVerificationChecks,
  buildAnswer,
  getMemory,
  resolveSymbols,
  runMarketDataLookup,
  runPortfolioAnalysis,
  runRiskAssessment,
  setMemory
} from './ai-agent.chat.helpers';
import {
  runRebalancePlan,
  runStressTest
} from './ai-agent.scenario.helpers';
import {
  generateTextWithMinimax,
  generateTextWithZAiGlm
} from './ai-llm.providers';
import { calculateConfidence, determineToolPlan } from './ai-agent.utils';

@Injectable()
export class AiService {
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
    private readonly portfolioService: PortfolioService,
    private readonly propertyService: PropertyService,
    private readonly redisCacheService: RedisCacheService
  ) {}

  public async generateText({ prompt }: { prompt: string }) {
    const zAiGlmApiKey =
      process.env.z_ai_glm_api_key ?? process.env.Z_AI_GLM_API_KEY;
    const zAiGlmModel = process.env.z_ai_glm_model ?? process.env.Z_AI_GLM_MODEL;
    const minimaxApiKey =
      process.env.minimax_api_key ?? process.env.MINIMAX_API_KEY;
    const minimaxModel = process.env.minimax_model ?? process.env.MINIMAX_MODEL;
    const providerErrors: string[] = [];

    if (zAiGlmApiKey) {
      try {
        return await generateTextWithZAiGlm({
          apiKey: zAiGlmApiKey,
          model: zAiGlmModel,
          prompt
        });
      } catch (error) {
        providerErrors.push(
          `z_ai_glm: ${error instanceof Error ? error.message : 'request failed'}`
        );
      }
    }

    if (minimaxApiKey) {
      try {
        return await generateTextWithMinimax({
          apiKey: minimaxApiKey,
          model: minimaxModel,
          prompt
        });
      } catch (error) {
        providerErrors.push(
          `minimax: ${error instanceof Error ? error.message : 'request failed'}`
        );
      }
    }

    const openRouterApiKey = await this.propertyService.getByKey<string>(
      PROPERTY_API_KEY_OPENROUTER
    );

    const openRouterModel = await this.propertyService.getByKey<string>(
      PROPERTY_OPENROUTER_MODEL
    );

    if (!openRouterApiKey || !openRouterModel) {
      throw new Error(
        providerErrors.length > 0
          ? `No AI provider configured (${providerErrors.join('; ')})`
          : 'OpenRouter is not configured'
      );
    }

    const openRouterService = createOpenRouter({
      apiKey: openRouterApiKey
    });

    return generateText({
      prompt,
      model: openRouterService.chat(openRouterModel)
    });
  }

  public async chat({
    languageCode,
    query,
    sessionId,
    symbols,
    userCurrency,
    userId
  }: {
    languageCode: string;
    query: string;
    sessionId?: string;
    symbols?: string[];
    userCurrency: string;
    userId: string;
  }): Promise<AiAgentChatResponse> {
    const normalizedQuery = query.trim();
    const resolvedSessionId = sessionId?.trim() || randomUUID();
    const memory = await getMemory({
      redisCacheService: this.redisCacheService,
      sessionId: resolvedSessionId,
      userId
    });
    const plannedTools = determineToolPlan({
      query: normalizedQuery,
      symbols
    });
    const toolCalls: AiAgentToolCall[] = [];
    const citations: AiAgentChatResponse['citations'] = [];
    const verification: AiAgentChatResponse['verification'] = [];
    let portfolioAnalysis: Awaited<ReturnType<typeof runPortfolioAnalysis>>;
    let riskAssessment: ReturnType<typeof runRiskAssessment>;
    let marketData: Awaited<ReturnType<typeof runMarketDataLookup>>;
    let rebalancePlan: ReturnType<typeof runRebalancePlan>;
    let stressTest: ReturnType<typeof runStressTest>;
    for (const toolName of plannedTools) {
      try {
        if (toolName === 'portfolio_analysis') {
          portfolioAnalysis = await runPortfolioAnalysis({
            portfolioService: this.portfolioService,
            userId
          });

          toolCalls.push({
            input: {},
            outputSummary: `${portfolioAnalysis.holdingsCount} holdings analyzed`,
            status: 'success',
            tool: toolName
          });

          citations.push({
            confidence: 0.9,
            snippet: `${portfolioAnalysis.holdingsCount} holdings, total ${portfolioAnalysis.totalValueInBaseCurrency.toFixed(2)} ${userCurrency}`,
            source: toolName
          });
        } else if (toolName === 'risk_assessment') {
          if (!portfolioAnalysis) {
            portfolioAnalysis = await runPortfolioAnalysis({
              portfolioService: this.portfolioService,
              userId
            });
          }

          riskAssessment = runRiskAssessment({
            portfolioAnalysis
          });

          toolCalls.push({
            input: {},
            outputSummary: `concentration ${riskAssessment.concentrationBand}`,
            status: 'success',
            tool: toolName
          });

          citations.push({
            confidence: 0.85,
            snippet: `top allocation ${(riskAssessment.topHoldingAllocation * 100).toFixed(2)}%, HHI ${riskAssessment.hhi.toFixed(3)}`,
            source: toolName
          });
        } else if (toolName === 'market_data_lookup') {
          const requestedSymbols = resolveSymbols({
            portfolioAnalysis,
            query: normalizedQuery,
            symbols
          });

          marketData = await runMarketDataLookup({
            dataProviderService: this.dataProviderService,
            portfolioAnalysis,
            symbols: requestedSymbols
          });

          toolCalls.push({
            input: { symbols: requestedSymbols },
            outputSummary: `${marketData.quotes.length}/${marketData.symbolsRequested.length} quotes resolved`,
            status: 'success',
            tool: toolName
          });

          if (marketData.quotes.length > 0) {
            const topQuote = marketData.quotes[0];

            citations.push({
              confidence: 0.82,
              snippet: `${topQuote.symbol} ${topQuote.marketPrice.toFixed(2)} ${topQuote.currency}`,
              source: toolName
            });
          }
        } else if (toolName === 'rebalance_plan') {
          if (!portfolioAnalysis) {
            portfolioAnalysis = await runPortfolioAnalysis({
              portfolioService: this.portfolioService,
              userId
            });
          }

          rebalancePlan = runRebalancePlan({
            portfolioAnalysis
          });

          toolCalls.push({
            input: { maxAllocationTarget: rebalancePlan.maxAllocationTarget },
            outputSummary: `${rebalancePlan.overweightHoldings.length} overweight holdings`,
            status: 'success',
            tool: toolName
          });

          citations.push({
            confidence: 0.8,
            snippet:
              rebalancePlan.overweightHoldings.length > 0
                ? `${rebalancePlan.overweightHoldings[0].symbol} exceeds target by ${(rebalancePlan.overweightHoldings[0].reductionNeeded * 100).toFixed(1)}pp`
                : 'No overweight holdings above max allocation target',
            source: toolName
          });
        } else if (toolName === 'stress_test') {
          if (!portfolioAnalysis) {
            portfolioAnalysis = await runPortfolioAnalysis({
              portfolioService: this.portfolioService,
              userId
            });
          }

          stressTest = runStressTest({
            portfolioAnalysis
          });

          toolCalls.push({
            input: { shockPercentage: stressTest.shockPercentage },
            outputSummary: `estimated drawdown ${stressTest.estimatedDrawdownInBaseCurrency.toFixed(2)} ${userCurrency}`,
            status: 'success',
            tool: toolName
          });

          citations.push({
            confidence: 0.8,
            snippet: `${(stressTest.shockPercentage * 100).toFixed(0)}% shock drawdown ${stressTest.estimatedDrawdownInBaseCurrency.toFixed(2)} ${userCurrency}`,
            source: toolName
          });
        }
      } catch (error) {
        toolCalls.push({
          input: {},
          outputSummary: error?.message ?? 'tool execution failed',
          status: 'failed',
          tool: toolName
        });
      }
    }

    addVerificationChecks({
      marketData,
      portfolioAnalysis,
      rebalancePlan,
      stressTest,
      toolCalls,
      verification
    });

    const answer = await buildAnswer({
      generateText: ({ prompt }) => this.generateText({ prompt }),
      languageCode,
      marketData,
      memory,
      portfolioAnalysis,
      query: normalizedQuery,
      rebalancePlan,
      riskAssessment,
      stressTest,
      userCurrency
    });

    verification.push({
      check: 'output_completeness',
      details:
        answer.length > 0
          ? 'Answer generated successfully'
          : 'Answer content is empty',
      status: answer.length > 0 ? 'passed' : 'failed'
    });

    verification.push({
      check: 'citation_coverage',
      details:
        citations.length >=
        toolCalls.filter(({ status }) => {
          return status === 'success';
        }).length
          ? 'Each successful tool call has at least one citation'
          : 'Citation coverage is incomplete',
      status:
        citations.length >=
        toolCalls.filter(({ status }) => {
          return status === 'success';
        }).length
          ? 'passed'
          : 'warning'
    });

    const confidence = calculateConfidence({
      toolCalls,
      verification
    });

    const updatedMemoryTurns = [
      ...memory.turns,
      {
        answer,
        query: normalizedQuery,
        timestamp: new Date().toISOString(),
        toolCalls: toolCalls.map(({ status, tool }) => {
          return {
            status,
            tool
          };
        })
      }
    ].slice(-AI_AGENT_MEMORY_MAX_TURNS);

    await setMemory({
      memory: {
        turns: updatedMemoryTurns
      },
      redisCacheService: this.redisCacheService,
      sessionId: resolvedSessionId,
      userId
    });

    return {
      answer,
      citations,
      confidence,
      memory: {
        sessionId: resolvedSessionId,
        turns: updatedMemoryTurns.length
      },
      toolCalls,
      verification
    };
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
