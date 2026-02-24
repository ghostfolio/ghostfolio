# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a fork of **Ghostfolio** (open-source wealth management software) being extended with **AgentForge** — a domain-specific AI agent for personal finance. The agent wraps existing Ghostfolio services as tools (portfolio analysis, transactions, market data, etc.) and integrates LangSmith for observability and evaluation.

**Tech stack:** NestJS (backend) + Angular 21 (frontend) + PostgreSQL (Prisma) + Redis + Nx monorepo.

## Development Setup

**Prerequisites:** Node.js ≥22.18.0, Docker.

```bash
cp .env.dev .env          # populate with your values
npm install
docker compose -f docker/docker-compose.dev.yml up -d   # starts PostgreSQL + Redis
npm run database:setup    # runs db push + seed
npm run start:server      # NestJS API on :3333
npm run start:client      # Angular client on https://localhost:4200/en
```

The Angular client requires SSL certs (`apps/client/localhost.pem` + `apps/client/localhost.cert`). Generate with:

```bash
openssl req -x509 -newkey rsa:2048 -nodes -keyout apps/client/localhost.pem -out apps/client/localhost.cert -days 365 \
  -subj "/C=CH/ST=State/L=City/O=Organization/OU=Unit/CN=localhost"
```

## Common Commands

| Task             | Command                                                                       |
| ---------------- | ----------------------------------------------------------------------------- |
| Run all tests    | `npm test`                                                                    |
| Test API only    | `npm run test:api`                                                            |
| Test single file | `npm run test:single` (edit `package.json` `test:single` to target your file) |
| Lint all         | `npm run lint`                                                                |
| Format           | `npm run format`                                                              |
| Database GUI     | `npm run database:gui`                                                        |
| Push DB schema   | `npm run database:push`                                                       |
| Create migration | `npm run prisma migrate dev --name <name>`                                    |
| Build production | `npm run build:production`                                                    |
| Storybook        | `npm run start:storybook`                                                     |

**Test a single spec file:** Set `--test-file <filename>` in `package.json`'s `test:single` script, then run `npm run test:single`.

**Run tests with env vars:** Tests use `.env.example` for environment:

```bash
npx dotenv-cli -e .env.example -- nx test api
```

## Monorepo Structure

This is an Nx workspace with four projects:

| Project  | Path           | Description                                                    |
| -------- | -------------- | -------------------------------------------------------------- |
| `api`    | `apps/api/`    | NestJS backend                                                 |
| `client` | `apps/client/` | Angular frontend (PWA)                                         |
| `common` | `libs/common/` | Shared types, interfaces, helpers, config, enums               |
| `ui`     | `libs/ui/`     | Shared Angular component library (also published to Storybook) |

**Path aliases** (defined in `tsconfig.base.json`):

- `@ghostfolio/api/*` → `apps/api/src/*`
- `@ghostfolio/client/*` → `apps/client/src/app/*`
- `@ghostfolio/common/*` → `libs/common/src/lib/*`
- `@ghostfolio/ui/*` → `libs/ui/src/lib/*`

## Backend Architecture (NestJS)

The API (`apps/api/src/app/`) uses NestJS modules. Key modules:

- **`portfolio/`** — Core financial calculations: `PortfolioService`, `PortfolioCalculatorFactory` (supports MWR, ROAI, ROI, TWR strategies), `CurrentRateService`, `RulesService`
- **`endpoints/ai/`** — AI integration: `AiService` wraps OpenRouter via Vercel AI SDK (`generateText`). Reads API key and model from `PropertyService` (stored in DB). This is the extension point for AgentForge.
- **`order/`** — Activities/transactions (buy, sell, dividend, fee, interest, liability)
- **`account/`** — Brokerage accounts and balances
- **`endpoints/`** — REST endpoints: `ai`, `api-keys`, `assets`, `benchmarks`, `market-data`, `platforms`, `public`, `tags`, `watchlist`

**Services** (`apps/api/src/services/`):

- `data-provider/` — Data provider abstraction over Yahoo Finance, CoinGecko, Alpha Vantage, EOD Historical Data, Financial Modeling Prep, Manual, Google Sheets
- `queues/` — Bull queues: `data-gathering` and `portfolio-snapshot`
- `prisma/` — PrismaService (DB access)
- `exchange-rate-data/` — Currency conversion
- `benchmark/`, `market-data/`, `symbol-profile/`, `property/`, `configuration/`, `cron/`

**AgentForge tools** should wrap existing services: `PortfolioService.getDetails()`, `PortfolioService.getPerformance()`, order/account endpoints, `MarketDataService`, `BenchmarkService`.

## Frontend Architecture (Angular)

- `apps/client/src/app/` — Pages/routes following Angular module pattern
- `libs/ui/src/lib/` — Reusable components (tables, charts, forms, dialogs)
- i18n: locales in `apps/client/src/locales/`. Start client in a specific language by changing `--configuration=development-<locale>` in `start:client` script.

## Database (Prisma)

Schema: `prisma/schema.prisma`. Key models: `User`, `Account`, `AccountBalance`, `Order` (activities), `SymbolProfile`, `MarketData`, `Platform`, `Access`, `Property` (key-value store for app config including AI keys).

**AI config** is stored in the `Property` table, keyed by constants in `libs/common/src/lib/config.ts` (`PROPERTY_API_KEY_OPENROUTER`, `PROPERTY_OPENROUTER_MODEL`).

## AgentForge Extension

**Workflow:** For AgentForge feature work, follow `agentforge/WORKFLOW.md` — branch naming, per-branch implementation plans and progress logs, conventional commits, and pre-commit checks. When resuming work, read `agentforge/doc/features-index.md` and the current branch's `progress.md`.

The `agentforge/doc/` directory contains planning documents:

- `project-definition.md` — Full project requirements (MVP, eval framework, observability, verification)
- `pre-search-investigation-plan.md` — Architecture decisions (LangChain JS + LangSmith for observability, single-agent, 5 tools wrapping Ghostfolio services)

**Agent tool targets (from plan):**

1. `portfolio_analysis` → `PortfolioService.getDetails()` / `getHoldings()`
2. `transaction_list` → `OrderService` (activities)
3. `market_data` → `MarketDataService` / `DataProviderService`
4. `account_summary` → `AccountService` + `AccountBalanceService`
5. `portfolio_performance` → `PortfolioService.getPerformance()`

**Observability:** LangSmith (`LANGCHAIN_TRACING_V2=true`, `LANGCHAIN_API_KEY` env vars).

## Deployment

**Platform:** Railway. See `agentforge/doc/deployment-railway.md` for the decision, env vars, and deployment pipeline. Implementation plan: `agentforge/doc/features/agentforge-mvp-deployment/`.

## Experimental Features

- **Backend:** Remove permission via `UserService.without()` to gate features
- **Frontend:** Use `@if (user?.settings?.isExperimentalFeatures) {}` in templates

## Key Environment Variables

See `.env.dev` / `.env.example` for the full list. Required for development:

- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` — Redis connection
- `ACCESS_TOKEN_SALT`, `JWT_SECRET_KEY` — Auth secrets

For AgentForge: configure `PROPERTY_API_KEY_OPENROUTER` and `PROPERTY_OPENROUTER_MODEL` in the DB via the admin UI, or set them directly in the `Property` table.
