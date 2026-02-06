# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ghostfolio is an open source wealth management software built with TypeScript in an Nx monorepo workspace. It's a full-stack application with Angular frontend and NestJS backend, using PostgreSQL with Prisma ORM and Redis for caching.

## Development Commands

### Environment Setup

```bash
npm install
docker compose -f docker/docker-compose.dev.yml up -d  # Start PostgreSQL and Redis
npm run database:setup  # Initialize database schema
```

### Development Servers

```bash
npm run start:server     # Start NestJS API server
npm run start:client     # Start Angular client (English)
npm run watch:server     # Start server in watch mode for debugging
```

### Build and Production

```bash
npm run build:production          # Build both API and client for production
npm run start:production          # Run production build with database migration
```

### Database Operations

```bash
npm run database:push             # Sync schema with database (development)
npm run database:migrate          # Apply migrations (production)
npm run database:seed             # Seed database with initial data
npm run database:gui              # Open Prisma Studio
npm run database:format-schema    # Format Prisma schema
npm run database:generate-typings # Generate Prisma client
```

### Testing and Quality

```bash
npm test                    # Run all tests (API + common)
npm run test:api            # Run API tests only
npm run test:common         # Run common library tests
npm run test:single         # Run single test file (example provided)
npm run lint                # Run ESLint on all projects
npm run format              # Format code with Prettier
npm run format:check        # Check code formatting
```

### Nx Workspace Commands

```bash
nx affected:build           # Build affected projects
nx affected:test            # Test affected projects
nx affected:lint            # Lint affected projects
nx dep-graph                # View dependency graph
```

### Storybook (Component Library)

```bash
npm run start:storybook     # Start Storybook development server
npm run build:storybook     # Build Storybook for production
```

## Architecture

### Monorepo Structure

- **apps/api**: NestJS backend application
- **apps/client**: Angular frontend application
- **apps/client-e2e**: E2E tests for client
- **apps/ui-e2e**: E2E tests for UI components
- **libs/common**: Shared TypeScript libraries and utilities
- **libs/ui**: Angular UI component library

### Technology Stack

- **Frontend**: Angular 20 with Angular Material, Bootstrap utility classes
- **Backend**: NestJS with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Caching**: Redis with Bull for job queues
- **Build Tool**: Nx workspace
- **Testing**: Jest for unit tests, Cypress for E2E tests

### Key Dependencies

- **Authentication**: Passport (JWT, Google OAuth, WebAuthn)
- **Data Sources**: Yahoo Finance, CoinGecko APIs for market data
- **Charts**: Chart.js with various plugins
- **Payment**: Stripe integration
- **Internationalization**: Angular i18n with multiple language support

### Database Schema

The Prisma schema defines models for:

- User management and access control
- Account and portfolio tracking
- Trading activities and orders
- Market data and asset information
- Platform integrations

### Development Notes

- Node.js version >=22.18.0 required
- Uses Nx generators for consistent code scaffolding
- Husky for git hooks and code quality enforcement
- Environment files: `.env.dev` for development, `.env.example` as template
- SSL certificates can be generated for localhost development
- Experimental features can be toggled via user settings
- always run the .husky pre commit hooks after code changes
