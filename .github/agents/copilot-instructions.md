# portfolio-management Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-03-22

## Active Technologies
- TypeScript 5.9.2, Node.js >= 22.18.0 + Angular 21.1.1, NestJS 11.1.14, Angular Material 21.1.1, Prisma 6.19.0, big.js, date-fns 4.1.0 (003-portfolio-performance-views)
- PostgreSQL via Prisma ORM (003-portfolio-performance-views)
- TypeScript 5.9.2, Node.js ≥ 22.18.0 + NestJS 11.x (backend), Angular 21.x (frontend), Prisma 6.x (ORM), pdf-parse (PDF text), @azure/ai-form-recognizer (cloud OCR), tesseract.js (local OCR fallback) (004-k1-scan-import)
- PostgreSQL via Prisma (structured data), local filesystem `uploads/` (PDF files) (004-k1-scan-import)
- TypeScript 5.x (Node.js runtime) + NestJS 11.x, pdfjs-dist 5.4.x (already installed via pdf-parse), pdf-parse 2.4.x (kept for `isDigitalK1` detection) (005-k1-parser-fix)
- PostgreSQL via Prisma ORM (existing K1ImportSession, Document tables) (005-k1-parser-fix)
- TypeScript 5.x (strict mode, `noUnusedLocals`, `noUnusedParameters`) + NestJS 11+ (module-based DI), Prisma ORM 6.x, PostgreSQL 16, Redis (caching), pdfjs-dist (extraction — unaffected by this feature) (006-k1-model-review)
- PostgreSQL via Prisma (Docker dev: port 5434). All schema changes via `prisma migrate dev`. (006-k1-model-review)
- TypeScript 5.9.2, Node.js ≥22.18.0 + NestJS 11.1.14 (API), Angular 21.1.1 + Angular Material 21.1.1 (client), Prisma 6.19.0 (ORM), Nx 22.5.3 (monorepo), chart.js 4.5.1, date-fns 4.1.0, Bull 4.16.5 (queues), Redis (caching), Ionic 8.8.1 (008-fo-ui-redesign)
- PostgreSQL via Prisma ORM, Redis for caching (008-fo-ui-redesign)
- [e.g., Python 3.11, Swift 5.9, Rust 1.75 or NEEDS CLARIFICATION] + [e.g., FastAPI, UIKit, LLVM or NEEDS CLARIFICATION] (009-fmv-plaid-drilldown)
- [if applicable, e.g., PostgreSQL, CoreData, files or N/A] (009-fmv-plaid-drilldown)
- TypeScript 5.x (strict mode) + Angular 21+ (standalone components, signals), NestJS 11+ (module-based DI), Prisma ORM, `plaid` v41+ (Node SDK), `@plaid/link-initialize` (client), `@nestjs/bull` (BullMQ) (009-fmv-plaid-drilldown)
- PostgreSQL (Docker port 5434→5432), Redis (Docker port 6379→6379) (009-fmv-plaid-drilldown)

- TypeScript 5.9.2, Node.js ≥22.18.0 + NestJS 11.1.14 (API), Angular 21.1.1 + Angular Material 21.1.1 (client), Prisma 6.19.0 (ORM), Nx 22.5.3 (monorepo), big.js (decimal math), date-fns 4.1.0, chart.js 4.5.1, Bull 4.16.5 (job queues), Redis (caching), yahoo-finance2 3.13.2 (001-family-office-transform)

## Project Structure

```text
backend/
frontend/
tests/
```

## Commands

npm test; npm run lint

## Code Style

TypeScript 5.9.2, Node.js ≥22.18.0: Follow standard conventions

## Recent Changes
- 009-fmv-plaid-drilldown: Added TypeScript 5.x (strict mode) + Angular 21+ (standalone components, signals), NestJS 11+ (module-based DI), Prisma ORM, `plaid` v41+ (Node SDK), `@plaid/link-initialize` (client), `@nestjs/bull` (BullMQ)
- 009-fmv-plaid-drilldown: Added [e.g., Python 3.11, Swift 5.9, Rust 1.75 or NEEDS CLARIFICATION] + [e.g., FastAPI, UIKit, LLVM or NEEDS CLARIFICATION]
- 008-fo-ui-redesign: Added TypeScript 5.9.2, Node.js ≥22.18.0 + NestJS 11.1.14 (API), Angular 21.1.1 + Angular Material 21.1.1 (client), Prisma 6.19.0 (ORM), Nx 22.5.3 (monorepo), chart.js 4.5.1, date-fns 4.1.0, Bull 4.16.5 (queues), Redis (caching), Ionic 8.8.1


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
