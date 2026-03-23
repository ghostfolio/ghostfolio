# Feature Specification: FMV Portfolio View with Plaid Account Linking & Asset Drill-Down

**Feature Branch**: `009-fmv-plaid-drilldown`  
**Created**: 2026-03-22  
**Status**: Draft  
**Input**: User description: "Plaid account linking, FMV portfolio view, asset drill-down, restore admin-gated features for USER role"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Restore Admin-Gated Features for All Users (Priority: P1)

As a family office user with the `USER` role, I need access to the core portfolio features (Overview, Holdings, Summary, Markets, Watchlist, FIRE Calculator, X-Ray) that are currently hidden behind admin-only permissions. These features exist in the codebase under the "Legacy" nav group but are only visible when the user has `accessAdminControl` permission (ADMIN role). They should be available to all authenticated users.

**Why this priority**: Without this, USER-role users on deployed environments (e.g., Railway) cannot access fundamental portfolio features they need. This is a navigation and permission fix — the features already work, they're just hidden. This unblocks all other stories.

**Independent Test**: Log in as a USER-role account. Verify that Overview, Holdings, Summary, Watchlist, FIRE Calculator, and X-Ray are accessible from the main navigation without needing ADMIN role.

**Acceptance Scenarios**:

1. **Given** a user with `USER` role is logged in, **When** they view the navigation menu, **Then** they see all portfolio features (Overview, Holdings, Summary, Watchlist, FIRE, X-Ray) as accessible nav items — not hidden under an "Admin" dropdown
2. **Given** a user with `USER` role navigates to `/home/holdings`, **When** the page loads, **Then** the holdings table renders with all their portfolio positions, quantities, and performance data
3. **Given** a user with `USER` role navigates to `/portfolio/x-ray`, **When** the page loads, **Then** the X-Ray analysis renders showing portfolio concentration, regional exposure, and sector breakdown
4. **Given** a user with `USER` role navigates to `/portfolio/fire`, **When** the page loads, **Then** the FIRE calculator displays with their portfolio's withdrawal rate, savings rate, and projected timeline
5. **Given** a user with `USER` role navigates to `/home/watchlist`, **When** the page loads, **Then** the watchlist renders and allows adding/removing symbols

---

### User Story 2 - FMV Portfolio Dashboard (Priority: P1)

As a family office operator, I need a single "FMV" (Fair Market Value) view that aggregates the total value of all linked brokerage accounts and manually-tracked assets into one consolidated snapshot. This shows me my true net portfolio value across all accounts, with a breakdown by account showing each account's contribution.

**Why this priority**: The core value proposition — seeing total FMV across all accounts in one place. The existing Accounts page already computes `totalValueInBaseCurrency` and per-account `valueInBaseCurrency`. This story packages that into a dedicated FMV nav section with a hero total and account-level cards.

**Independent Test**: Navigate to the new FMV section. Verify the hero displays the aggregate value of all non-excluded accounts and that each account card shows its value, allocation percentage, and account name.

**Acceptance Scenarios**:

1. **Given** the user has 3 accounts with values of $500K, $300K, and $200K, **When** they navigate to the FMV view, **Then** the hero displays "$1,000,000" as total FMV and each account shows its contribution and allocation percentage
2. **Given** one account is marked as "excluded", **When** the FMV view loads, **Then** that account is omitted from the total and listed separately with an "Excluded" badge
3. **Given** accounts are denominated in different currencies (USD, EUR), **When** the FMV view loads, **Then** all values are converted to the user's base currency for aggregation, and each account shows both its native currency value and base currency equivalent
4. **Given** the user clicks on an account card, **When** the account detail opens, **Then** they see that account's holdings, activities, and balance history (existing account detail dialog behavior)
5. **Given** the user has no accounts, **When** they navigate to the FMV view, **Then** they see an empty state with a prompt to create or link an account

---

### User Story 3 - Asset Drill-Down per Account (Priority: P1)

As a family office operator, I need to drill into any brokerage account and see exactly which stocks, bonds, or crypto it holds — including number of shares, original cost basis, current market value, and performance over time. This information already exists in the system (computed from Orders + MarketData) but needs to be prominently accessible from the FMV view.

**Why this priority**: This is the core drill-down experience. The existing account detail dialog already shows a Holdings tab with a holdings table filtered by account. This story ensures that flow is prominent and accessible directly from the FMV account cards, and that cost basis and per-holding performance are visible.

**Independent Test**: From the FMV view, click an account card. Verify the account detail shows a Holdings tab listing all positions with symbol, quantity, cost basis, current value, and gain/loss.

**Acceptance Scenarios**:

1. **Given** a brokerage account holds 100 shares of NVDA bought at $50/share (cost basis $5,000) now worth $150/share, **When** the user drills into that account's holdings, **Then** they see: Symbol: NVDA, Quantity: 100, Cost Basis: $5,000, Current Value: $15,000, Gain: +$10,000 (+200%)
2. **Given** the user clicks on a specific holding row (e.g., NVDA), **When** the holding detail opens, **Then** they see a price chart, all buy/sell activity history, dividend history, sector/country breakdown, and performance metrics
3. **Given** an account has holdings in multiple asset classes (stocks, crypto, bonds), **When** the user views the account holdings, **Then** holdings are sortable by value, performance, name, or allocation percentage
4. **Given** the user has sold some shares of a position over time, **When** they view cost basis, **Then** the cost basis reflects only the remaining shares (adjusted for partial sales)

---

### User Story 4 - Plaid Account Linking (Priority: P2)

As a family office operator, I need to connect my brokerage accounts via Plaid so that account balances, holdings (positions), and transactions are automatically imported. This eliminates the need for manual data entry and keeps my FMV view current with real brokerage data.

**Why this priority**: Plaid automates data ingestion. However, the FMV view and drill-down (US2 & US3) deliver value even with manually-entered data. Plaid adds automation on top. This is P2 because it requires a new third-party integration (Plaid API credentials, sandbox setup, webhook infrastructure).

**Independent Test**: Click "Link Account" in the FMV view. Complete the Plaid Link flow with a sandbox institution. Verify the account appears with its holdings and balances auto-populated.

**Acceptance Scenarios**:

1. **Given** the user is on the FMV Accounts page, **When** they click "Link Account via Plaid", **Then** the Plaid Link modal opens showing the institution search
2. **Given** the user selects a brokerage (e.g., Vanguard sandbox), **When** they complete the auth flow, **Then** the system creates an Account record linked to the Plaid item, and a Platform record for the institution
3. **Given** a Plaid-linked account is created, **When** the system syncs investments, **Then** it creates SymbolProfile records for each holding, MarketData records for current prices, and Order records representing current positions
4. **Given** a Plaid-linked account exists, **When** the user returns to the FMV view, **Then** they see the account with its current balance and holdings automatically reflected — no manual entry needed
5. **Given** the Plaid connection expires or requires re-authentication, **When** the user visits the FMV view, **Then** they see a warning badge on the affected account with a "Reconnect" action that re-opens Plaid Link in update mode

---

### User Story 5 - Plaid Ongoing Sync (Priority: P3)

As a family office operator, I need my Plaid-linked accounts to stay current automatically. When I buy or sell stocks in my brokerage, those changes should be reflected in the system within a reasonable timeframe without manual intervention.

**Why this priority**: P3 because initial linking (US4) provides the first snapshot. Ongoing sync requires webhook infrastructure and background job scheduling, which is additive complexity beyond the initial value.

**Independent Test**: After initial Plaid linking, simulate a new transaction in Plaid sandbox. Trigger a sync. Verify the new position or balance change appears in the account holdings.

**Acceptance Scenarios**:

1. **Given** a Plaid-linked account, **When** the system runs a scheduled sync (or receives a webhook), **Then** new transactions since the last sync are imported as Order records
2. **Given** new investment holdings appear in Plaid (new stock purchase), **When** sync completes, **Then** the FMV view and account drill-down show the new position
3. **Given** a holding's quantity changes in Plaid (partial sale), **When** sync completes, **Then** the system creates a SELL Order record and the position quantity updates accordingly
4. **Given** the user manually triggers a "Refresh" on a Plaid-linked account, **When** the refresh completes, **Then** the account shows updated balances and holdings with a "Last synced: [timestamp]" indicator

---

### Edge Cases

- What happens when Plaid returns a security that has no matching symbol in the system? System creates a MANUAL-type SymbolProfile with the Plaid-provided name, ticker, and CUSIP.
- What happens when Plaid returns a holding with no cost basis (e.g., transferred-in shares)? System displays "N/A" for cost basis and excludes from gain/loss calculations until the user manually provides it.
- What happens when the same stock is held across multiple accounts? Each account shows its own position independently; the FMV view aggregates across all accounts.
- How does the system handle Plaid rate limits? Queue sync operations using the existing BullMQ job infrastructure with exponential backoff.
- What if a user has both Plaid-linked and manually-managed accounts? Both types appear in the FMV view with a visual indicator (Plaid icon vs manual icon) of the data source.
- What happens when a Plaid-linked account is disconnected? The account and its historical data remain in the system (marked as "disconnected"), but no further syncs occur until reconnected.

## Requirements _(mandatory)_

### Functional Requirements

#### Navigation & Permission Restoration

- **FR-001**: System MUST expose Overview, Holdings, Summary, Watchlist, FIRE Calculator, and X-Ray pages to users with the `USER` role (not just ADMIN)
- **FR-002**: System MUST reorganize navigation to include an "FMV" top-level nav item with sub-items: "Dashboard" (aggregate view) and "Accounts" (existing accounts list)
- **FR-003**: System MUST move the previously admin-gated legacy features into a user-accessible section of the navigation (e.g., under existing "Analysis" or as standalone items)

#### FMV Dashboard

- **FR-004**: System MUST display a total Fair Market Value that sums the value of all non-excluded accounts
- **FR-005**: System MUST break down total FMV by account, showing each account's name, platform, value, allocation percentage, and data source indicator (Plaid vs manual)
- **FR-006**: System MUST display per-account value as the sum of holdings market value plus cash balance
- **FR-007**: System MUST handle multi-currency aggregation by converting all account values to the user's base currency

#### Asset Drill-Down

- **FR-008**: System MUST display per-account holdings with: symbol, name, quantity, cost basis, current market value, unrealized gain/loss (absolute and percentage)
- **FR-009**: System MUST allow users to click any holding to view detailed information including price chart, activity history, dividends, and sector/country breakdown
- **FR-010**: System MUST support sorting holdings by any displayed column (value, performance, name, quantity, allocation)

#### Plaid Integration

- **FR-011**: System MUST integrate with Plaid Link to allow users to authenticate with their brokerage institutions
- **FR-012**: System MUST exchange Plaid public tokens for access tokens and store them securely (encrypted at rest)
- **FR-013**: System MUST sync investment holdings from Plaid, creating corresponding symbol profiles, market data, and activity records
- **FR-014**: System MUST sync account balances from Plaid and update the account's balance field
- **FR-015**: System MUST provide a mechanism to re-authenticate expired Plaid connections (update mode)
- **FR-016**: System MUST map Plaid security types to the existing asset class and sub-class categories

#### Ongoing Sync

- **FR-017**: System MUST support scheduled background syncs for Plaid-linked accounts using the existing job queue infrastructure
- **FR-018**: System MUST track the last sync timestamp per Plaid-linked account and display it to the user
- **FR-019**: System MUST allow users to manually trigger an on-demand sync for any Plaid-linked account

### Key Entities

- **PlaidItem**: Represents a Plaid Link connection to an institution. Key attributes: access token (encrypted), institution ID, institution name, connection status, consent expiration date. Relates to one User and one or more Accounts.
- **Account** (extended): Existing account entity gains an optional relationship to a PlaidItem and a data source indicator (PLAID vs MANUAL). Existing fields (balance, currency, platform) are populated automatically from Plaid data.
- **SymbolProfile** (existing): Holdings from Plaid map to SymbolProfile records. System matches by ticker/CUSIP or creates new MANUAL-type profiles for unmatched securities.
- **Order** (existing): Plaid investment transactions become Order records (BUY, SELL, DIVIDEND). Source is tracked to distinguish Plaid-imported vs manually-entered activities.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users with `USER` role can access all portfolio features (Overview, Holdings, Summary, Watchlist, FIRE, X-Ray) without requiring ADMIN role promotion
- **SC-002**: The FMV Dashboard displays the aggregate value of all linked accounts within 3 seconds of page load
- **SC-003**: Users can drill from the FMV view into any account's individual holdings within 2 clicks
- **SC-004**: Each holding displays cost basis, current value, and gain/loss — matching what the user would see in their brokerage account
- **SC-005**: Users can complete the Plaid Link flow (search institution → authenticate → account created) in under 2 minutes
- **SC-006**: After initial Plaid sync, all investment holdings from the brokerage appear in the account's drill-down view with accurate quantities and current values
- **SC-007**: Plaid-linked accounts reflect updated balances and holdings within 24 hours of changes occurring at the brokerage
- **SC-008**: A user with 5 linked accounts totaling 50 holdings sees a complete FMV snapshot load in under 5 seconds

## Assumptions

- Plaid API credentials (client ID and secret) will be configured as environment variables. Sandbox credentials will be used during development; production credentials for deployment.
- The existing Platform model is sufficient to represent Plaid institutions (name + URL). No new model needed for institutions.
- The existing Order + MarketData + SymbolProfile pipeline is the right mechanism for representing Plaid holdings — no separate "Position" model is needed.
- Plaid's "Investments" product (which includes holdings and transactions) is the primary product needed. "Transactions" product (bank transactions) is out of scope for this initiative.
- The existing account detail dialog UI (with Holdings, Activities, Cash Balances tabs) provides the drill-down UX. No new detail page is needed — just better entry points from the FMV view.
- The existing BullMQ job queue (already used for portfolio snapshots) will be reused for Plaid sync scheduling.
- Account types (SECURITIES, CHECKING, etc.) from Plaid can be stored as a new field on the Account model or as metadata — exact storage approach is a planning-phase decision.
- The Markets page (currently admin-only) requires the market data read permission which USER does not have. This page may need its own permission or the permission may need to be granted to USER role. The exact approach will be determined during planning.
