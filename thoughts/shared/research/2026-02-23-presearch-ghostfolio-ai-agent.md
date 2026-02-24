---
date: 2026-02-23T13:45:00-05:00
researcher: Max Petrusenko
git_commit: TBD
branch: main
repository: ghostfolio/ghostfolio
topic: "Ghostfolio AI Agent Pre-Search: Architecture, Framework, and Integration Strategy"
tags: [presearch, ghostfolio, ai-agent, finance, architecture, langgraph]
status: complete
last_updated: 2026-02-23
last_updated_by: Maxpetrusenko
---

# Pre-Search: Ghostfolio AI Agent

**Date**: 2026-02-23 1:45 PM EST
**Researcher**: Max Petrusenko
**Repository**: https://github.com/ghostfolio/ghostfolio
**Domain**: Finance / Wealth Management

## Executive Summary

**Selected Domain**: Finance (Ghostfolio)
**Framework**: LangGraph
**LLM**: Claude Sonnet 4.5 (via OpenRouter/Anthropic)
**Observability**: LangSmith
**Integration Strategy**: Extend existing AI service + new agent module

**Rationale**: Modern TypeScript stack, existing AI infrastructure (`@openrouter/ai-sdk-provider` already in dependencies), clean NestJS architecture, straightforward financial domain with clear verification rules.

---

## Phase 1: Repository Exploration ✅

### Repository Overview
- **Name**: Ghostfolio
- **Type**: Open source wealth management software
- **Tech Stack**: TypeScript, Angular 21, NestJS 11, Prisma, PostgreSQL, Redis
- **License**: AGPL v3
- **Structure**: Nx monorepo with apps (api, client) and shared libraries

### Key Metrics
- **TypeScript files**: 4,272
- **Architecture**: Modern monorepo with Nx workspace
- **API**: NestJS REST API with modular structure
- **Database**: PostgreSQL with Prisma ORM
- **Existing AI**: Has `@openrouter/ai-sdk-provider` and `ai` v4.3.16 in dependencies

### Existing AI Infrastructure
Ghostfolio already has AI capabilities:
- **File**: `apps/api/src/app/endpoints/ai/ai.service.ts`
- **Endpoint**: `/ai/prompt/:mode`
- **Current use**: Portfolio analysis prompt generation
- **Dependencies**: `@openrouter/ai-sdk-provider`, `ai` package

### Data Models (Prisma Schema)

```prisma
// Core Entities
User {
  id, email, provider, role, settings
  accounts: Account[]
  activities: Order[]
  watchlist: SymbolProfile[]
}

Account {
  id, name, balance, currency, user
  activities: Order[]
}

Order {
  id, date, quantity, unitPrice, type, account
  SymbolProfile: SymbolProfile
}

SymbolProfile {
  symbol, name, assetClass, assetSubClass, dataSource
  activities: Order[]
  marketData: MarketData[]
}
```

### API Structure

**Key Endpoints**:
- `/order/` - Transaction management (BUY, SELL, DIVIDEND)
- `/portfolio/` - Portfolio calculation and analysis
- `/account/` - Account management
- `/asset/` - Asset information
- `/ai/prompt/:mode` - Existing AI endpoint
- `/import/` - Data import
- `/export/` - Data export

**Existing Services**:
- `OrderService` - Transaction processing
- `PortfolioService` - Portfolio analytics
- `DataProviderService` - Market data (Yahoo, CoinGecko, Alpha Vantage)
- `ExchangeRateService` - Currency conversion
- `PortfolioCalculator` - Performance metrics (TWR, ROI, MWR)

---

## Phase 2: Agent Framework Selection

### Evaluated Frameworks

| Framework | Pros | Cons | Score |
|-----------|------|------|-------|
| **LangChain** | Huge ecosystem, extensive docs | Overkill for simple agents | 6/10 |
| **LangGraph** | Multi-step reasoning, state machines, cycles | Steeper learning curve | 9/10 |
| **CrewAI** | Multi-agent collaboration | Overkill for single agent | 5/10 |
| **AutoGen** | Conversational agents | Microsoft ecosystem bias | 4/10 |
| **Custom** | Full control, learning exercise | Reinventing the wheel | 3/10 |

### Selection: LangGraph ✅

**Why LangGraph?**
1. **Multi-step financial reasoning**: Portfolio optimization requires:
   - Fetch portfolio data
   - Analyze allocation
   - Calculate risk metrics
   - Generate recommendations
   - Verify against constraints
   - Format response

2. **State machine architecture**: Perfect for complex workflows
3. **Built-in persistence**: Agent state management
4. **Observability first-class**: Native LangSmith integration
5. **Growing ecosystem**: Active development, good docs

**Resources**:
- Docs: https://langchain-ai.github.io/langgraph/
- Examples: https://github.com/langchain-ai/langgraph/tree/main/examples

---

## Phase 3: Evaluation Strategy

### Eval Framework: LangSmith ✅

**Why LangSmith?**
- **Native LangGraph integration** - No extra setup
- **Excellent tracing** - See every step, tool call, LLM invocation
- **Dataset management** - Built-in test case management
- **Evaluation scoring** - Automated evaluation with custom rubrics
- **Prompt versioning** - A/B test prompts
- **Cost tracking** - Token usage and cost monitoring

### Evaluation Types

| Type | What to Test | Success Criteria |
|------|--------------|------------------|
| **Correctness** | Accurate financial data and calculations | >95% accuracy vs PortfolioService |
| **Tool Selection** | Right tool for query | >90% correct tool selection |
| **Tool Execution** | Parameters correct, calls succeed | >95% success rate |
| **Safety** | No harmful advice, hallucination control | <5% unsupported claims |
| **Consistency** | Same input → same output | 100% deterministic where expected |
| **Edge Cases** | Missing data, invalid input | Graceful failure, no crashes |
| **Latency** | Response time | <5s single-tool, <15s multi-step |

### Test Dataset Structure (50+ Cases)

**20 Happy Path**:
- Portfolio analysis for diversified portfolio
- Risk assessment for conservative/aggresive profiles
- Tax optimization suggestions
- Rebalancing recommendations
- Dividend analysis

**10 Edge Cases**:
- Empty portfolio
- Single asset portfolio
- Invalid date ranges
- Missing market data
- Currency conversion errors

**10 Adversarial**:
- Attempt portfolio manipulation
- Request tax evasion strategies
- Insider information requests
- Extreme leverage requests
- Regulatory circumvention

**10 Multi-Step**:
- Complete portfolio review (analysis → risk → optimization → rebalance)
- Tax-loss harvesting workflow
- Retirement planning analysis
- Goal-based investment planning
- Sector rotation analysis

---

## Phase 4: Observability Tooling

### Observability Stack: LangSmith ✅

**Implementation Plan**:

```typescript
// apps/api/src/app/endpoints/ai-agent/ai-agent.config.ts
import { Client } from "langsmith";

export const langsmith = new Client({
  apiKey: process.env.LANGSMITH_API_KEY,
  projectName: "ghostfolio-ai-agent"
});

// Trace agent runs
export async function traceAgentRun(params: {
  query: string;
  userId: string;
  tools: string[];
}) {
  return langsmith.run(params);
}
```

**Tracked Metrics**:
1. **Latency breakdown**:
   - LLM call time
   - Tool execution time
   - Total response time
2. **Token usage**:
   - Input tokens per request
   - Output tokens per request
   - Cost tracking
3. **Tool calls**:
   - Which tools called
   - Parameters passed
   - Results returned
4. **Errors**:
   - Failed tool calls
   - LLM errors
   - Validation failures
5. **User feedback**:
   - Thumbs up/down
   - Correction suggestions

**Dashboard Views**:
- Real-time agent traces
- Performance metrics over time
- Cost projection charts
- Error categorization
- Eval score trends

---

## Architecture Design

### Agent Components

```typescript
// apps/api/src/app/endpoints/ai-agent/

ai-agent.module.ts          // NestJS module
ai-agent.controller.ts      // REST endpoints
ai-agent.service.ts         // Agent orchestration
tools/                      // Tool definitions
  ├── portfolio-analysis.tool.ts
  ├── risk-assessment.tool.ts
  ├── tax-optimization.tool.ts
  ├── market-sentiment.tool.ts
  ├── dividend-calendar.tool.ts
  └── rebalance-target.tool.ts
graph/                      // LangGraph state machine
  ├── agent-graph.ts
  ├── state.ts
  └── nodes.ts
verification/               // Verification layer
  ├── financial-math.validator.ts
  ├── risk-threshold.validator.ts
  ├── data-freshness.validator.ts
  └── portfolio-constraint.validator.ts
```

### LangGraph State Machine

```typescript
// Agent State
interface AgentState {
  query: string;
  userId: string;
  accountId?: string;
  portfolio?: PortfolioData;
  analysis?: AnalysisResult;
  recommendations?: Recommendation[];
  verification?: VerificationResult;
  error?: Error;
  finalResponse?: string;
}

// Graph Flow
query → understand_intent → select_tools → execute_tools
  → synthesize → verify → format_response → output
```

### Integration Points

**1. Extend Existing AI Service**:
```typescript
// apps/api/src/app/endpoints/ai/ai.service.ts

// Add new modes
export enum AiMode {
  PORTFOLIO_ANALYSIS = 'portfolio-analysis',
  RISK_ASSESSMENT = 'risk-assessment',
  TAX_OPTIMIZATION = 'tax-optimization',
  // ... existing modes
}
```

**2. New Agent Endpoint**:
```typescript
// apps/api/src/app/endpoints/ai-agent/ai-agent.controller.ts

@Controller('ai-agent')
export class AiAgentController {
  @Post('chat')
  async chat(@Body() query: ChatQuery) {
    return this.agentService.process(query);
  }
}
```

**3. Hook into PortfolioService**:
```typescript
// Reuse existing portfolio calculations
const portfolio = await this.portfolioService.getPortfolio({
  userId,
  withAggregations: true
});
```

---

## Tool Definitions

### 1. portfolio_analysis(account_id)
**Purpose**: Fetch portfolio holdings, allocation, performance
**Implementation**: Extend `PortfolioService`
**Returns**:
```typescript
{
  holdings: Holding[],
  allocation: AssetAllocation,
  performance: {
    totalReturn: number,
    annualizedReturn: number,
    volatility: number
  }
}
```

### 2. risk_assessment(portfolio_data)
**Purpose**: Calculate VaR, concentration risk, volatility
**Implementation**: Extend `PortfolioCalculator`
**Returns**:
```typescript
{
  valueAtRisk: number,
  concentrationRisk: number,
  volatility: number,
  riskScore: 1-10
}
```

### 3. tax_optimization(transactions)
**Purpose**: Tax-loss harvesting, efficiency scores
**Implementation**: New logic based on Order data
**Returns**:
```typescript
{
  taxLossOpportunities: Opportunity[],
  taxEfficiencyScore: number,
  estimatedSavings: number
}
```

### 4. market_sentiment(symbols[])
**Purpose**: News sentiment, trends analysis
**Implementation**: News API integration (NewsAPI, Alpha Vantage)
**Returns**:
```typescript
{
  sentiment: 'bullish' | 'bearish' | 'neutral',
  score: -1 to 1,
  drivers: string[]
}
```

### 5. dividend_calendar(symbols[])
**Purpose**: Upcoming dividends, yield projections
**Implementation**: Extend `SymbolProfileService`
**Returns**:
```typescript
{
  upcomingDividends: Dividend[],
  annualYield: number,
  monthlyIncome: number
}
```

### 6. rebalance_target(current, target_alloc)
**Purpose**: Trades needed to reach target allocation
**Implementation**: New calculation logic
**Returns**:
```typescript
{
  requiredTrades: Trade[],
  estimatedCost: number,
  drift: number
}
```

---

## Verification Layer

### 1. Financial Math Validation
```typescript
// Verify calculations against existing PortfolioService
async function verifyCalculations(agentResult: CalculationResult) {
  const actual = await portfolioService.calculateMetrics(agentResult.portfolioId);
  const diff = Math.abs(agentResult.totalReturn - actual.totalReturn);
  if (diff > 0.01) { // 1% tolerance
    throw new VerificationError('Calculation mismatch');
  }
}
```

### 2. Risk Threshold Check
```typescript
// Verify recommendations align with user's risk tolerance
async function verifyRiskTolerance(recommendation: Recommendation, userRiskLevel: number) {
  if (recommendation.riskScore > userRiskLevel) {
    return {
      passed: false,
      reason: `Recommendation risk (${recommendation.riskScore}) exceeds user tolerance (${userRiskLevel})`
    };
  }
}
```

### 3. Data Freshness Check
```typescript
// Ensure market data is recent
async function verifyDataFreshness(symbols: string[]) {
  const stale = await dataProviderService.checkDataAge(symbols);
  if (stale.length > 0) {
    return {
      passed: false,
      reason: `Stale data for ${stale.length} symbols`,
      staleSymbols: stale
    };
  }
}
```

### 4. Portfolio Constraint Validation
```typescript
// Verify recommendations don't exceed account balance
async function verifyPortfolioConstraints(trades: Trade[], accountId: string) {
  const account = await accountService.getById(accountId);
  const totalCost = trades.reduce((sum, t) => sum + t.cost, 0);
  if (totalCost > account.balance) {
    return {
      passed: false,
      reason: `Trade cost ($${totalCost}) exceeds balance ($${account.balance})`
    };
  }
}
```

---

## Technical Stack

### Layer | Technology
------|------------
**Agent Framework** | LangGraph
**LLM** | Claude Sonnet 4.5 (via OpenRouter/Anthropic)
**Observability** | LangSmith
**Backend** | NestJS (existing)
**Database** | PostgreSQL + Prisma (existing)
**Frontend** | Angular (existing)
**Deployment** | Railway/Vercel

---

## Environment Variables

```bash
# AI/LLM
OPENAI_API_KEY=sk-...                    # For OpenRouter/OpenAI
ANTHROPIC_API_KEY=sk-ant-...             # For Claude directly
OPENROUTER_API_KEY=sk-or-...             # For OpenRouter

# Observability
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=lsv2_...               # LangSmith
LANGCHAIN_PROJECT=ghostfolio-ai-agent

# Existing Ghostfolio env
DATABASE_URL=postgresql://...
REDIS_HOST=...
JWT_SECRET_KEY=...
```

---

## Build Strategy (Priority Order)

### Priority 1: Foundation (Hours 1-4)
- [x] Repository research (✅ complete)
- [ ] Set up LangGraph + LangSmith
- [ ] Create AI Agent module structure
- [ ] Implement single tool: `portfolio_analysis`
- [ ] End-to-end test: query → tool → response

### Priority 2: Tool Expansion (Hours 5-12)
- [ ] Add remaining 5 tools
- [ ] Test each tool independently
- [ ] Error handling for each tool
- [ ] Tool parameter validation

### Priority 3: Multi-Step Reasoning (Hours 13-20)
- [ ] Build LangGraph state machine
- [ ] Implement agent nodes
- [ ] Chain tools appropriately
- [ ] Test multi-step scenarios

### Priority 4: Observability (Hours 21-24)
- [ ] Integrate LangSmith tracing
- [ ] Set up dashboards
- [ ] Track latency, tokens, costs
- [ ] Debug agent failures

### Priority 5: Eval Framework (Hours 25-32)
- [ ] Create 50 test cases
- [ ] Build evaluation scripts
- [ ] Run baseline evals
- [ ] Measure pass rates

### Priority 6: Verification Layer (Hours 33-40)
- [ ] Implement all 4 verification checks
- [ ] Add confidence scoring
- [ ] Escalation triggers
- [ ] Test verification accuracy

### Priority 7: Iterate & Polish (Hours 41-48)
- [ ] Fix eval failures
- [ ] Improve prompt engineering
- [ ] Optimize for latency
- [ ] Document architecture

### Priority 8: Open Source Prep (Hours 49-56)
- [ ] Package as reusable module
- [ ] Write comprehensive docs
- [ ] Create setup guide
- [ ] Publish npm package or PR

---

## Open Source Contribution Plan

### Contribution Type: New Agent Package

**Package**: `@ghostfolio/ai-agent`

**Contents**:
- LangGraph agent implementation
- 6 financial analysis tools
- Verification framework
- Eval suite (50 test cases)
- Integration guide

**Publishing**:
- npm package
- GitHub repository
- Documentation site
- Demo video

**Alternative**: PR to Ghostfolio main repo with AI agent feature as opt-in module

---

## AI Cost Analysis

### Development Cost Projection

**Assumptions**:
- Claude Sonnet 4.5: $3/1M input, $15/1M output tokens
- 100 development queries/day
- Avg 2K input + 1K output tokens/query
- 7 days development

**Development Cost**:
- Input: 100 × 2K × 7 = 1.4M tokens × $3 = **$4.20**
- Output: 100 × 1K × 7 = 0.7M tokens × $15 = **$10.50**
- **Total**: **~$15/week**

### Production Cost Projections

**Assumptions**:
- Avg tokens/query: 3K input + 1.5K output
- Queries/user/day: 2

| Scale | Daily Queries | Monthly Cost |
|-------|--------------|--------------|
| 100 users | 200 | $90 |
| 1,000 users | 2,000 | $900 |
| 10,000 users | 20,000 | $9,000 |
| 100,000 users | 200,000 | $90,000 |

**Optimization Strategies**:
- Caching (Redis) - 30% reduction
- Smaller model for simple queries - 40% reduction
- Batch processing - 20% reduction

---

## Deployment Strategy

### Platform: Railway ✅

**Why Railway?**
- Simple Docker deployment
- Built-in Postgres
- Easy env var management
- Good free tier for testing
- Scalable to production

**Alternative**: Vercel (serverless), Render (Docker)

### Deployment Steps
1. Fork Ghostfolio repo
2. Create Railway project
3. Connect GitHub repo
4. Add env vars (LLM keys, LangSmith)
5. Deploy
6. Run migrations
7. Test agent endpoint

---

## Demo Video Outline (3-5 min)

### Section 1: Introduction (30s)
- Project overview
- Domain (finance) + AI agent
- Tech stack (LangGraph + Claude)

### Section 2: Agent Capabilities (90s)
- Natural language query about portfolio
- Tool selection and execution
- Multi-step reasoning example
- Verification in action

### Section 3: Eval Framework (60s)
- Test suite overview
- Running evals
- Pass rates and metrics
- LangSmith dashboard

### Section 4: Observability (30s)
- Agent traces
- Latency breakdown
- Token usage and costs

### Section 5: Demo & Wrap-up (30s)
- Live agent interaction
- Open source package link
- Social media call-to-action

---

## Risk Mitigation

### Technical Risks
| Risk | Mitigation |
|------|------------|
| LLM hallucinations | Verification layer + source attribution |
| Slow response times | Streaming responses + caching |
| High costs | Token optimization + cheaper model for simple queries |
| Tool failures | Graceful degradation + error handling |

### Domain Risks
| Risk | Mitigation |
|------|------------|
| Financial advice liability | Disclaimer + human-in-loop for large trades |
| Regulatory compliance | No direct trading, recommendations only |
| Data privacy | No PII in LLM context, anonymize data |

---

## Success Criteria

### MVP (24 Hours) ✅
- [ ] Agent responds to natural language finance queries
- [ ] 3+ functional tools working
- [ ] Tool calls execute successfully
- [ ] Agent synthesizes results coherently
- [ ] Conversation history maintained
- [ ] Basic error handling
- [ ] 1+ domain-specific verification
- [ ] 5+ test cases
- [ ] Deployed publicly

### Full Submission (7 Days)
- [ ] All MVP criteria
- [ ] 50+ test cases with >80% pass rate
- [ ] LangSmith observability integrated
- [ ] 4+ verification checks implemented
- [ ] <5s latency (single-tool), <15s (multi-step)
- [ ] <5% hallucination rate
- [ ] Open source package published
- [ ] Complete documentation

---

## Next Steps

### Immediate (Today)
1. **Answer critical questions** (Decisions 1-5 above)
2. **Set up development environment**
   - Clone Ghostfolio fork
   - Install LangGraph + LangSmith
   - Configure API keys
3. **Create AI Agent module**
   - Set up NestJS module structure
   - Implement first tool: `portfolio_analysis`
4. **End-to-end test**
   - Query agent → tool execution → response

### This Week
- Day 1-2: Tool expansion (all 6 tools)
- Day 3-4: LangGraph state machine + multi-step reasoning
- Day 4: Observability integration
- Day 5: Eval framework (50 test cases)
- Day 6: Verification layer + iteration
- Day 7: Polish + documentation + open source prep

### Questions Remaining

1. **LLM Provider**: OpenRouter or direct Anthropic/OpenAI?
2. **Observability Budget**: LangSmith free tier (3K traces/month) or paid?
3. **Deployment**: Railway, Vercel, or other?
4. **Frontend Integration**: Add chat UI to Ghostfolio or keep API-only?
5. **Branding**: Package name (@ghostfolio/ai-agent or standalone)?

---

## References

- **Ghostfolio**: https://github.com/ghostfolio/ghostfolio
- **LangGraph**: https://langchain-ai.github.io/langgraph/
- **LangSmith**: https://smith.langchain.com/
- **Requirements**: /Users/maxpetrusenko/Desktop/Gauntlet Cohort/llm-agent-forge/requirements.md
- **Project Repository**: https://github.com/ghostfolio/ghostfolio
