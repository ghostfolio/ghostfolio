# Tax Metrics — Existing Transaction and Dividend Data Model

**Owner:** Tharun Swaminathan
**Iteration:** 1 — Design & Data Modelling
**Date:** September 15, 2026

## Objective

The purpose of this review was to understand how Ghostfolio currently stores and
handles transactions, especially dividend transactions, before adding any
tax-related functionality.

Since the tax feature will later include withholding tax, FIFO capital gains,
average-cost calculations, tax lots, yearly summaries, and exports, it is
important to first understand the existing data model instead of creating a
separate structure that does not match the rest of Ghostfolio.

No implementation changes were made as part of this task.

## Current Persistence Model

Ghostfolio stores portfolio transactions using the Prisma `Order` model in
`prisma/schema.prisma`.

Even though the database model is called `Order`, the rest of the application
usually refers to these records as activities.

The `Order` model already contains the main information needed to describe a
portfolio transaction.

| Field | Current purpose |
|---|---|
| `id` | Unique identifier for the activity |
| `accountId` | Account associated with the activity |
| `comment` | Optional user comment |
| `createdAt` | Time the database record was created |
| `currency` | Currency used by the activity |
| `date` | Date of the financial activity |
| `fee` | Fee associated with the activity |
| `quantity` | Number of units or shares |
| `symbolProfileId` | Asset associated with the activity |
| `tags` | Tags attached to the activity |
| `type` | Type of financial activity |
| `unitPrice` | Price or value per unit |
| `updatedAt` | Last time the record was updated |
| `userId` | User who owns the activity |

The currently supported activity types are:

- `BUY`
- `DIVIDEND`
- `FEE`
- `INTEREST`
- `LIABILITY`
- `SELL`

This means the tax calculations should build on the existing activity model
where possible instead of introducing a completely separate transaction model.

## Dividend Representation

Ghostfolio does not currently have a separate database table or entity just for
dividends.

A dividend is stored as a normal activity where:

`type = DIVIDEND`

The activity still uses fields such as `quantity`, `unitPrice`, `currency`,
`date`, and `fee`.

For example, one of the existing Ghostfolio import samples contains the
following dividend activity:

- Asset: Microsoft (`MSFT`)
- Quantity: 5 shares
- Unit price: 0.62 USD
- Type: `DIVIDEND`
- Fee: 0
- Currency: USD
- Date: November 17, 2021

Using the existing quantity and unit-price values, the dividend amount
represented by this activity is:

`5 × 0.62 = 3.10 USD`

This gives the tax feature a natural starting point for determining the dividend
value. In the later withholding-tax design, this value can be used when defining
the relationship between gross dividend, withholding tax, and net dividend.

## Existing Fee Field

Ghostfolio already has a `fee` field on the activity model.

The same field is available when an activity is created, and the current DTO
requires it to be a non-negative number.

However, the current model does not define this field specifically as dividend
withholding tax. It is a general activity fee.

Because of this, the tax extension should not simply reinterpret `fee` as
withholding tax.

A brokerage fee and dividend withholding tax represent different pieces of
financial information and may both exist on the same activity.

For the later withholding-tax design, these values should remain conceptually
separate:

- Gross dividend
- Activity fee
- Withholding tax
- Net dividend

The exact withholding fields will be designed in the Sep 16 task. This review
only establishes that the existing `fee` field should keep its current meaning.

## API and DTO Flow

The current Ghostfolio activity flow already provides a path that can be
extended later for tax-related information.

At a high level, the flow is:

`Prisma Order` → `CreateOrderDto / UpdateOrderDto` → Activities backend service → Activity API response

The existing `CreateOrderDto` already validates important transaction fields
such as:

- currency
- date
- fee
- quantity
- symbol
- activity type
- unit price

The API activity interface then extends the stored `Order` with additional
calculated information used by the application.

This means the tax feature should reuse this existing flow where possible.
Creating a second, independent dividend transaction API would add unnecessary
duplication and make the system harder to maintain.

## Currency Handling

Currency is already part of Ghostfolio's activity model.

The activity response also includes calculated values such as:

- `feeInAssetProfileCurrency`
- `feeInBaseCurrency`
- `unitPriceInAssetProfileCurrency`
- `value`
- `valueInBaseCurrency`

This is important for the tax feature because tax values may eventually need
to be reported both in the activity currency and the user's base currency.

Instead of creating a separate currency-conversion method only for tax, the
future implementation should follow Ghostfolio's existing conversion approach
where practical.

The exact withholding-tax currency fields are not being decided in this task.
That will be part of the Sep 16 schema design.

## Transaction Ordering

Transaction ordering is especially important for the later FIFO capital-gains
calculation.

During the code review, Ghostfolio's existing activity handling was found to
use the activity date as the main chronological value.

This gives us the primary ordering value needed for tax calculations:

`activity date`

However, FIFO also needs a deterministic rule when two transactions have the
same date or timestamp.

The activity model contains both an `id` and `createdAt`, but this review does
not yet define which should be treated as the official secondary tax ordering.

This should be explicitly decided in the FIFO specification rather than leaving
the calculation dependent on accidental database ordering.

For now, this is recorded as an open design question for the Sep 17 FIFO task.

## Import Compatibility

Ghostfolio already supports importing activities, including dividend
transactions.

This matters because future tax functionality cannot assume that every dividend
was manually entered by the user.

For example, an imported dividend may contain the basic dividend amount but may
not contain withholding-tax information.

The tax design should therefore be able to handle at least two situations:

1. A dividend where withholding information is available.
2. A dividend where withholding information is not available.

Missing withholding information should not make an otherwise valid historical
dividend unusable.

The exact validation and default behavior will be defined when the withholding
schema is designed.

## Existing Tests

Ghostfolio already contains tests and sample data involving dividend
transactions.

These are useful because future tax tests should follow the project's existing
testing style instead of building a completely different testing approach.

One useful example is
`portfolio-calculator-msft-buy-with-dividend.spec.ts`, which already covers a
Microsoft purchase together with a dividend. The existing import sample also
contains an MSFT dividend activity.

For future tax calculations, similar tests can be extended to verify exact
numeric results for cases such as:

- dividend withholding
- multiple purchases followed by a sale
- partial FIFO lot usage
- multiple tax lots
- same-date activities
- rounding
- missing withholding information

No new tests were written during this task because Iteration 1 is currently
focused on design and data modelling.

## Design Conclusions

Based on the existing Ghostfolio implementation, the tax feature should extend
the current activity model rather than create a separate transaction system.

The main conclusions from this review are:

1. Dividends are already represented as normal activities using
   `type = DIVIDEND`.

2. The existing `Order` model provides most of the transaction information
   needed by future tax calculations.

3. The existing `fee` field should remain separate from withholding tax.

4. Gross dividend, withholding amount, and net dividend should remain
   distinguishable rather than being combined into one value.

5. Existing currency-handling patterns should be reused where possible.

6. Imported and historical dividends may not always contain withholding
   information, so the future design needs to handle missing values safely.

7. FIFO will need an explicitly documented ordering rule, especially when
   multiple activities have the same date.

These conclusions will be used as the starting point for the remaining tax
design tasks in Iteration 1.

## Open Questions

The following questions were identified during this review and will be resolved
in later Iteration 1 tax tasks.

### Withholding Tax

- Should the withholding amount be stored directly?
- Should a withholding rate also be stored?
- If both amount and rate are available, which one should be treated as the
  source value?
- Should withholding be optional for older or imported dividend records?
- How should withholding amounts be represented across different currencies?

### FIFO and Tax Lots

- What secondary ordering rule should be used when activities share the same
  timestamp?
- How should stock splits affect tax-lot quantities and cost basis?
- What information needs to be stored to trace a sale back to the acquisition
  lots that were consumed?

### Calculation Precision

- Where should rounding occur?
- Should calculations use the activity currency first and convert afterward,
  or use base-currency values during the calculation?

These questions are intentionally left open here because they belong to the
specific design tasks scheduled later in Iteration 1.

## Next Task

The next tax task is scheduled for September 16:

**Design the withholding-tax field schema for dividend transactions.**

The Sep 15 review provides the baseline for that work.

The next design will define the withholding-tax inputs and fields, including
their types, optional/required behavior, validation rules, currency meaning,
and relationship to gross and net dividend values.

No withholding-tax implementation will be added yet because Iteration 1 is the
design and data-modelling phase.

## Relevant Files Reviewed

The main Ghostfolio files reviewed for this task were:

- `prisma/schema.prisma`
- `libs/common/src/lib/dtos/create-order.dto.ts`
- `libs/common/src/lib/interfaces/activities.interface.ts`
- `apps/api/src/app/activities/activities.controller.ts`
- `apps/api/src/app/activities/activities.service.ts`
- `apps/api/src/app/portfolio/calculator/roai/portfolio-calculator.ts`
- `apps/api/src/app/portfolio/calculator/roai/portfolio-calculator-msft-buy-with-dividend.spec.ts`
- `test/import/ok/sample.json`

These files were used to understand the current transaction and dividend data
model, API flow, currency handling, and existing dividend behavior. No
source-code changes were made during this review.
