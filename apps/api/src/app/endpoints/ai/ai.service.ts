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
import {
  AiAgentChatResponse,
  AiAgentToolCall
} from './ai-agent.interfaces';
import {
  AI_AGENT_MEMORY_MAX_TURNS,
  buildAnswer,
  getMemory,
  resolveSymbols,
  runMarketDataLookup,
  runPortfolioAnalysis,
  runRiskAssessment,
  setMemory
} from './ai-agent.chat.helpers';
import { addVerificationChecks } from './ai-agent.verification.helpers';
import {
  runRebalancePlan,
  runStressTest
} from './ai-agent.scenario.helpers';
import { createHoldingsPrompt } from './ai-agent.prompt.helpers';
import {
  generateTextWithMinimax,
  generateTextWithZAiGlm
} from './ai-llm.providers';
import { AiObservabilityService } from './ai-observability.service';
import {
  calculateConfidence,
  determineToolPlan,
  evaluateAnswerQuality
} from './ai-agent.utils';
import {
  applyToolExecutionPolicy,
  createPolicyRouteResponse,
  formatPolicyVerificationDetails
} from './ai-agent.policy.utils';
@Injectable()
export class AiService {
  public constructor(
    private readonly dataProviderService: DataProviderService,
    private readonly portfolioService: PortfolioService,
    private readonly propertyService: PropertyService,
    private readonly redisCacheService: RedisCacheService,
    private readonly aiObservabilityService: AiObservabilityService
  ) {}
  public async generateText({
    prompt,
    signal
  }: {
    prompt: string;
    signal?: AbortSignal;
  }) {
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
          prompt,
          signal
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
          prompt,
          signal
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
      abortSignal: signal,
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
    const chatStartedAt = Date.now();
    let llmGenerationInMs = 0;
    let memoryReadInMs = 0;
    let memoryWriteInMs = 0;
    let toolExecutionInMs = 0;

    try {
      const memoryReadStartedAt = Date.now();
      const memory = await getMemory({
        redisCacheService: this.redisCacheService,
        sessionId: resolvedSessionId,
        userId
      });
      memoryReadInMs = Date.now() - memoryReadStartedAt;

      const plannedTools = determineToolPlan({
        query: normalizedQuery,
        symbols
      });
      const policyDecision = applyToolExecutionPolicy({
        plannedTools,
        query: normalizedQuery
      });
      const toolCalls: AiAgentToolCall[] = [];
      const citations: AiAgentChatResponse['citations'] = [];
      const verification: AiAgentChatResponse['verification'] = [];
      let portfolioAnalysis: Awaited<ReturnType<typeof runPortfolioAnalysis>>;
      let riskAssessment: ReturnType<typeof runRiskAssessment>;
      let marketData: Awaited<ReturnType<typeof runMarketDataLookup>>;
      let rebalancePlan: ReturnType<typeof runRebalancePlan>;
      let stressTest: ReturnType<typeof runStressTest>;

      for (const toolName of policyDecision.toolsToExecute) {
        const toolStartedAt = Date.now();

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
        } finally {
          toolExecutionInMs += Date.now() - toolStartedAt;
        }
      }

      addVerificationChecks({
        marketData,
        portfolioAnalysis,
        portfolioAnalysisExpected: policyDecision.toolsToExecute.includes(
          'portfolio_analysis'
        ),
        rebalancePlan,
        stressTest,
        toolCalls,
        verification
      });

      verification.push({
        check: 'policy_gating',
        details: formatPolicyVerificationDetails({
          policyDecision
        }),
        status:
          policyDecision.blockedByPolicy || policyDecision.route === 'clarify'
            ? 'warning'
            : 'passed'
      });

      let answer = createPolicyRouteResponse({
        policyDecision
      });

      if (policyDecision.route === 'tools') {
        const llmGenerationStartedAt = Date.now();
        answer = await buildAnswer({
          generateText: (options) => this.generateText(options),
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
        llmGenerationInMs = Date.now() - llmGenerationStartedAt;
      }

      verification.push({
        check: 'output_completeness',
        details:
          answer.length > 0
            ? 'Answer generated successfully'
            : 'Answer content is empty',
        status: answer.length > 0 ? 'passed' : 'failed'
      });
      verification.push(
        evaluateAnswerQuality({
          answer,
          query: normalizedQuery
        })
      );

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

      const memoryWriteStartedAt = Date.now();
      await setMemory({
        memory: {
          turns: updatedMemoryTurns
        },
        redisCacheService: this.redisCacheService,
        sessionId: resolvedSessionId,
        userId
      });
      memoryWriteInMs = Date.now() - memoryWriteStartedAt;

      const response: AiAgentChatResponse = {
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

      response.observability = await this.aiObservabilityService.captureChatSuccess({
        durationInMs: Date.now() - chatStartedAt,
        latencyBreakdownInMs: {
          llmGenerationInMs,
          memoryReadInMs,
          memoryWriteInMs,
          toolExecutionInMs
        },
        policy: {
          blockReason: policyDecision.blockReason,
          blockedByPolicy: policyDecision.blockedByPolicy,
          forcedDirect: policyDecision.forcedDirect,
          plannedTools: policyDecision.plannedTools,
          route: policyDecision.route,
          toolsToExecute: policyDecision.toolsToExecute
        },
        query: normalizedQuery,
        response,
        sessionId: resolvedSessionId,
        userId
      });

      return response;
    } catch (error) {
      await this.aiObservabilityService.captureChatFailure({
        durationInMs: Date.now() - chatStartedAt,
        error,
        query: normalizedQuery,
        sessionId: resolvedSessionId,
        userId
      });

      throw error;
    }
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

    return createHoldingsPrompt({
      holdings,
      languageCode,
      mode,
      userCurrency
    });
  }
}
