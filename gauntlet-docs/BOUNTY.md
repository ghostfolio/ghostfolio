# BOUNTY.md — Financial News Integration for Ghostfolio

## The Customer

**Self-directed retail investors** who use Ghostfolio to track their portfolio but lack context for _why_ their holdings are moving. Currently, Ghostfolio shows performance numbers — a user sees their portfolio dropped 3% today but has to leave the app and manually search for news about each holding. This is the most common complaint in personal finance tools: data without context.

The specific niche: investors holding 5-20 individual stocks who check their portfolio daily and want a single place to understand both the _what_ (performance) and the _why_ (news events driving price changes).

## The Data Source

**Finnhub Financial News API** (finnhub.io) — a real-time financial data provider offering company-specific news aggregated from major financial publications. The API returns structured articles with headlines, summaries, source attribution, publication timestamps, and URLs.

Articles are fetched per-symbol and stored in Ghostfolio's PostgreSQL database via Prisma, creating a persistent, queryable news archive tied to the user's portfolio holdings. This is not a pass-through cache — articles are stored as first-class entities with full CRUD operations.

### Data Model

```
NewsArticle {
  id            String   @id @default(cuid())
  symbol        String   // e.g., "AAPL"
  headline      String
  summary       String
  source        String   // e.g., "Reuters", "CNBC"
  url           String
  imageUrl      String?
  publishedAt   DateTime
  finnhubId     Int      @unique  // deduplication key
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

### API Endpoints (CRUD)

| Method | Endpoint                         | Purpose                            |
| ------ | -------------------------------- | ---------------------------------- |
| GET    | `/api/v1/news?symbol=AAPL`       | Read stored articles for a symbol  |
| POST   | `/api/v1/news/fetch?symbol=AAPL` | Fetch from Finnhub and store       |
| DELETE | `/api/v1/news/cleanup`           | Remove articles older than 30 days |

## The Features

### 1. News Storage and Retrieval

Ghostfolio now stores financial news articles linked to portfolio symbols. Articles are fetched from Finnhub, deduplicated by source ID, and persisted in PostgreSQL. The system handles missing API keys, rate limits, and invalid symbols gracefully.

### 2. AI Agent News Tool

A new `get_portfolio_news` tool in the AI agent allows natural language news queries:

- **"What news is there about AAPL?"** — Fetches and returns recent Apple news
- **"What news is affecting my portfolio?"** — Combines holdings lookup with news fetch across all positions
- **"Why did my portfolio drop today?"** — Multi-step: gets performance data, identifies losers, fetches their news

The tool integrates with the existing 8-tool agent, enabling multi-step queries that combine news context with portfolio data, performance metrics, and transaction history.

### 3. Eval Coverage

New test cases validate the news tool across happy path, multi-step, and edge case scenarios, maintaining the suite's 100% pass rate.

## The Impact

**Before:** A Ghostfolio user sees their portfolio is down 2.4% today. They open a new browser tab, search for "AAPL stock news," then "MSFT stock news," then "VTI stock news" — repeating for each holding. They mentally piece together which news events explain the drop.

**After:** The user asks the AI agent "Why is my portfolio down today?" The agent checks performance, identifies the biggest losers, fetches relevant news for those symbols, and synthesizes a response: "Your portfolio is down 2.4% today, primarily driven by MSFT (-3.1%) after reports of slowing cloud growth, and AAPL (-1.8%) following supply chain concerns in Asia. VTI is flat. Here are the key articles..."

This transforms Ghostfolio from a portfolio _tracker_ into a portfolio _intelligence_ tool — the difference between a dashboard and an advisor.
