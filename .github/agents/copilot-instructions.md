# portfolio-management Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-03-18

## Active Technologies
- TypeScript 5.9.2, Node.js >= 22.18.0 + Angular 21.1.1, NestJS 11.1.14, Angular Material 21.1.1, Prisma 6.19.0, big.js, date-fns 4.1.0 (003-portfolio-performance-views)
- PostgreSQL via Prisma ORM (003-portfolio-performance-views)
- TypeScript 5.9.2, Node.js ≥ 22.18.0 + NestJS 11.x (backend), Angular 21.x (frontend), Prisma 6.x (ORM), pdf-parse (PDF text), @azure/ai-form-recognizer (cloud OCR), tesseract.js (local OCR fallback) (004-k1-scan-import)
- PostgreSQL via Prisma (structured data), local filesystem `uploads/` (PDF files) (004-k1-scan-import)

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
- 004-k1-scan-import: Added TypeScript 5.9.2, Node.js ≥ 22.18.0 + NestJS 11.x (backend), Angular 21.x (frontend), Prisma 6.x (ORM), pdf-parse (PDF text), @azure/ai-form-recognizer (cloud OCR), tesseract.js (local OCR fallback)
- 003-portfolio-performance-views: Added TypeScript 5.9.2, Node.js >= 22.18.0 + Angular 21.1.1, NestJS 11.1.14, Angular Material 21.1.1, Prisma 6.19.0, big.js, date-fns 4.1.0

- 001-family-office-transform: Added TypeScript 5.9.2, Node.js ≥22.18.0 + NestJS 11.1.14 (API), Angular 21.1.1 + Angular Material 21.1.1 (client), Prisma 6.19.0 (ORM), Nx 22.5.3 (monorepo), big.js (decimal math), date-fns 4.1.0, chart.js 4.5.1, Bull 4.16.5 (job queues), Redis (caching), yahoo-finance2 3.13.2

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
