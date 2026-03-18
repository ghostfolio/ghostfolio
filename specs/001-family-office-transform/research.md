# Research: Single Family Office Platform Transformation

**Phase 0 Output** | **Date**: 2026-03-15

## 1. Prisma Schema Extension Strategy

**Decision**: Add 9 new models and 8 new enums to the existing `prisma/schema.prisma`, connecting to the existing `User` and `Account` models via foreign keys. No modifications to existing models except adding optional back-references.

**Rationale**: The existing schema is stable (101 migrations over 4 years). New models are additive — they reference existing `User` and `Account` models without modifying their structure. The `Entity` model connects to `User` (who administers it) and `Account` (what it owns). This preserves backward compatibility: all existing Ghostfolio functionality continues to work for users who don't use family office features.

**Alternatives considered**:

- **Separate database**: Rejected — would require cross-database joins for valuations that reference existing market data, and duplicated exchange rate logic.
- **JSON fields on existing models**: Rejected — partnership membership percentages, K-1 box data, and valuation histories need proper relational querying, aggregation, and referential integrity.
- **New Prisma schema file**: Rejected — Prisma does not support multi-schema in a single datasource cleanly. One schema file is the established pattern.

## 2. Entity-Account Ownership Model

**Decision**: Create a new `Ownership` model that links `Entity` to `Account` (using the existing composite key `[id, userId]`). Ownership records include a percentage (Decimal), effective date, and optional end date. The existing `Account` model gains an optional `ownerships Ownership[]` back-reference but its structure is otherwise unchanged.

**Rationale**: The existing `Account` model uses a composite PK of `(id, userId)`. The `Ownership` model references both `accountId` and `accountUserId` to maintain this relationship. Users who don't create entities still use accounts normally — the `ownerships` relation is simply empty. Percentages are stored as `Decimal` (not `Float`) for financial precision, consistent with industry standards.

**Alternatives considered**:

- **Add `entityId` directly to Account**: Rejected — an account can be owned by multiple entities with different percentages (e.g., Trust A: 60%, LLC B: 40%).
- **Use the existing `Access` model for ownership**: Rejected — `Access` is a user-to-user permission grant, not an entity-to-asset ownership with percentages.

## 3. Partnership Valuation & NAV Tracking

**Decision**: Use a dedicated `PartnershipValuation` model (partnership ID + date + NAV + source) rather than reusing the existing `MarketData` model. Partnership assets get a separate `AssetValuation` model.

**Rationale**: The existing `MarketData` model is designed for public market data (dataSource + symbol + date, populated by data providers). Partnership NAVs are manually entered, have different sources (appraisal, fund admin statement), and don't map to a data source/symbol pair. A separate model avoids polluting market data with manual entries and allows partnership-specific metadata (valuation source, fund admin notes).

**Alternatives considered**:

- **Reuse `MarketData` with `MANUAL` dataSource**: Rejected — `MarketData` uses a unique constraint on `(dataSource, date, symbol)` and is widely queried by the data gathering system. Inserting partnership NAVs would create phantom symbols in market data listings and break data-gathering cron jobs.
- **Store NAV as JSON on Partnership**: Rejected — time-series data needs efficient date-range queries and ordering.

## 4. K-1 Data Structure

**Decision**: Store K-1 box data as a structured `Json` field on the `KDocument` model, with a well-defined TypeScript interface `K1Data` enforced at the application layer. Use Prisma's `Json` type (maps to PostgreSQL `jsonb`).

**Rationale**: K-1 forms have ~20 standard boxes, but the IRS occasionally adds/modifies boxes. A JSON field provides flexibility for future box additions without schema migrations, while the TypeScript interface ensures type safety at the application layer. The existing codebase already uses this pattern extensively — `SymbolProfile.countries`, `SymbolProfile.sectors`, `SymbolProfile.holdings`, and `Settings.settings` are all `Json` fields with TypeScript interfaces.

**Alternatives considered**:

- **Separate columns per K-1 box**: Rejected — 20+ nullable Decimal columns would be unwieldy, and each IRS form revision would require a migration.
- **Normalized K-1 line items table**: Rejected — over-engineering for manual data entry of ~20 fields per form. JSON with application-layer validation is simpler and follows existing patterns.

## 5. Private Market Performance Calculations

**Decision**: Implement XIRR (Newton-Raphson), TVPI, DPI, RVPI, and Modified Dietz as a standalone `FamilyOfficePerformanceCalculator` class in `apps/api/src/app/portfolio/calculator/family-office/`. This is NOT a subclass of the existing `PortfolioCalculator` abstract class.

**Rationale**: The existing `PortfolioCalculator` hierarchy (base → MWR/ROAI/ROI/TWR subclasses) is designed for public market securities with daily market prices, specific buy/sell activities, and exchange-rate-adjusted time-series. It uses `CurrentRateService` to fetch daily prices and builds transaction-point timelines. Private market partnerships have fundamentally different inputs: periodic NAV statements (not daily prices), capital calls/distributions (not buy/sell orders), and no active market data feed. Forcing partnerships into the existing calculator would require extensive refactoring of the base class and risk breaking the 21 existing ROAI spec tests.

**Alternatives considered**:

- **Extend existing `PortfolioCalculator` base class**: Rejected — the base class's `computeSnapshot()` method is tightly coupled to `CurrentRateService` for daily market prices and `PortfolioOrder` for buy/sell activities. These don't map to partnership cash flows.
- **New subclass of `PortfolioCalculator`**: Rejected — the abstract methods `calculateOverallPerformance()` and `getSymbolMetrics()` expect `TimelinePosition[]` with daily data points. Partnership valuations are periodic (quarterly/monthly), not daily.

## 6. Benchmark Comparison Overlay

**Decision**: Create a `FamilyOfficeBenchmarkService` that extends the existing `BenchmarkService` capabilities by adding period-matched comparison. It uses the existing `DataProviderService.getHistoricalData()` for benchmark price series and computes returns over the same periods as partnership performance.

**Rationale**: The existing `BenchmarkService` already stores benchmark symbol profiles in the `Property` table and fetches quotes via `DataProviderService`. The new service reuses this infrastructure but adds: (1) period-aligned return calculation, (2) excess return computation, (3) cumulative return comparison data for charting. Pre-configured benchmarks (SPY for S&P 500, AGG for bonds, VNQ for real estate, TIP for CPI proxy) use Yahoo Finance data already available through the existing `YAHOO` data source.

**Alternatives considered**:

- **Modify existing `BenchmarkService`**: Rejected — the existing service is focused on trend analysis (50d/200d moving averages) and market condition classification. Adding period-matched comparison would bloat it. Better to compose than modify.
- **External benchmark data API**: Rejected — Yahoo Finance already provides historical data for all needed benchmarks via the existing `yahoo-finance2` integration.

## 7. File Upload for K-1 PDF Documents

**Decision**: Implement a minimal file upload module using NestJS built-in `@nestjs/platform-express` (Multer) integration. Files stored on local filesystem under a configurable `UPLOAD_DIR` path, with metadata (file path, type, associations) stored in the `Document` Prisma model. Add `@nestjs/platform-express` Multer types (already a dependency via NestJS).

**Rationale**: The existing codebase has no file upload handling. Multer is included with `@nestjs/platform-express` (already a dependency at v11.0.9). Local filesystem storage is the simplest approach for a single family office deployment. The `Document` model stores the path and metadata, allowing future migration to cloud storage by swapping only the storage backend.

**Alternatives considered**:

- **Cloud storage (S3, Azure Blob)**: Rejected for initial scope — adds deployment complexity and external dependency not needed for single-office deployment. Can be added later by implementing a storage interface.
- **Store PDFs as Base64 in database**: Rejected — PostgreSQL is not designed for large binary objects; filesystem is more appropriate and allows direct file serving.

## 8. Exchange Rate Handling for Multi-Currency Partnerships

**Decision**: Reuse the existing `ExchangeRateDataService` for all currency conversions. When a partnership's NAV is in a different currency than the entity's base currency, apply the exchange rate at the valuation date using `ExchangeRateDataService.toCurrencyAtDate()`.

**Rationale**: The existing service already handles historical exchange rates with gap-filling (walks backward to last known rate), supports all major currencies, and is used extensively by the portfolio calculator and account service. No new currency logic needed.

**Alternatives considered**: None — the existing service is comprehensive and well-tested.

## 9. Angular Page Architecture

**Decision**: New family office pages follow the existing standalone component pattern with lazy-loaded routes. New pages are added as siblings to existing routes (not nested under `/portfolio`). Route structure: `/entities`, `/partnerships`, `/distributions`, `/k-documents`, `/reports`, `/family-dashboard`.

**Rationale**: The existing `/portfolio` route is the personal portfolio view and should remain unchanged. Family office features represent a distinct domain that warrants top-level navigation. Using separate routes keeps the existing portfolio experience intact while providing dedicated family office views. Lazy loading ensures no impact on initial bundle size for users who don't navigate to FO pages.

**Alternatives considered**:

- **Nest under `/portfolio/family-office/`**: Rejected — creates deep nesting and conflates personal portfolio tracking with institutional family office management.
- **Replace existing portfolio pages**: Rejected — the existing portfolio tracking for public securities is still valuable within the family office context. Family members may want both the traditional portfolio view (for their liquid holdings) and the family office view (for the full picture).

## 10. Permission Model for Family Office Features

**Decision**: Add new permission strings to the existing `permissions.ts` in `libs/common`. Family office features require the same `ADMIN` or `USER` role — no new role types needed. Permissions: `createEntity`, `updateEntity`, `deleteEntity`, `createPartnership`, `updatePartnership`, `deletePartnership`, `createDistribution`, `deleteDistribution`, `createKDocument`, `updateKDocument`, `uploadDocument`.

**Rationale**: The existing permission system is string-based and checked via `HasPermissionGuard` + `@HasPermission()` decorator. Adding new permission strings follows the exact same pattern used by account, order, and admin operations. All family office data is scoped to the authenticated user via `userId` on the `Entity` model.

**Alternatives considered**:

- **Entity-level permissions** (different users see different entities): Rejected for initial scope — this is a single family office with 1-5 admin users who all see everything. Can be added later using the existing `Access` model pattern.
