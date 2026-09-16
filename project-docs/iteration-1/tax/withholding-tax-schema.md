# Tax Metrics — Withholding-Tax Field Schema

**Owner:** Tharun Swaminathan
**Iteration:** 1 — Design & Data Modelling
**Date:** September 16, 2026

## Objective

The purpose of this design is to define how dividend withholding tax should be
represented in Ghostfolio before implementation begins in Iteration 2.

The design builds on the existing Ghostfolio activity model instead of creating
a separate dividend transaction structure.

This task defines the proposed fields, calculation relationships, validation
rules, currency behavior, backward compatibility, and future API impact.

No database or application code is changed as part of this task.

## Existing Dividend Model

Ghostfolio currently stores dividend transactions as normal `Order` activities
with:

`type = DIVIDEND`

The existing activity already contains the main values needed for a dividend,
including:

- `quantity`
- `unitPrice`
- `currency`
- `date`
- `fee`

The dividend value can be determined from:

`grossDividend = quantity × unitPrice`

The existing `fee` field is a general activity fee and should remain separate
from dividend withholding tax.

## Proposed Stored Field

The proposed new field on the existing Prisma `Order` model is:

`withholdingTax Float?`

### Meaning

`withholdingTax` represents the actual tax amount withheld from a dividend
payment.

The amount is stored in the activity's `currency`.

Example:

If the dividend activity uses USD, a value of:

`withholdingTax = 15.00`

means that 15.00 USD was withheld from that dividend payment.

### Why the Amount Is Stored

The withholding-tax amount should be treated as the authoritative value because
it represents the actual amount deducted from the dividend.

This also provides better traceability for imported transactions and future tax
reports.

The withholding percentage can be calculated from the stored amount when
needed, so storing both the amount and percentage would introduce the possibility
of inconsistent values.

## Null and Zero Behavior

The field should be nullable.

`withholdingTax = null`

means that withholding information is unknown or was not provided.

`withholdingTax = 0`

means that withholding information is known and no tax was withheld.

This distinction is important for imported and historical transactions.

Missing withholding information should not automatically be interpreted as zero.

This allows existing Ghostfolio dividend records to remain valid after the new
field is introduced.

## Derived Values

The tax feature should keep gross dividend, withholding tax, withholding rate,
and net dividend as separate values.

### Gross Dividend

`grossDividend = quantity × unitPrice`

The gross dividend is derived from the existing activity fields.

### Withholding-Tax Amount

`withholdingTax`

This is the stored value.

### Withholding-Tax Rate

The withholding rate is derived rather than stored:

`withholdingTaxRate = withholdingTax / grossDividend × 100`

The rate can only be calculated when:

- `grossDividend > 0`
- `withholdingTax` is not null

Otherwise:

`withholdingTaxRate = null`

### Net Dividend

The net dividend after withholding is:

`netDividend = grossDividend - withholdingTax`

If `withholdingTax` is unknown (`null`), the tax analytics layer should not
silently assume that withholding was zero.

In that case:

`netDividend = null`

for tax reporting purposes.

This preserves the difference between "no tax was withheld" and "we do not know
whether tax was withheld."

## Activity Fee

Activity fees and withholding tax should remain separate.

For a dividend:

`grossDividend = quantity × unitPrice`

`netDividend = grossDividend - withholdingTax`

If the dividend also has an activity fee, the cash effect can later be expressed
separately as:

`netCashAmount = netDividend - fee`

This prevents brokerage fees from being treated as tax.

## Proposed Prisma Change

The future Iteration 2 implementation is expected to extend the existing
`Order` model with:

```prisma
withholdingTax Float?
```

This is a proposed design only.

Using `Float?` follows the existing Ghostfolio storage pattern used for numeric
activity fields such as `fee`, `quantity`, and `unitPrice`.

Changing the wider application to a different database numeric type would be a
shared architecture change and is outside the scope of this tax task.

## Validation Rules

The following validation rules should apply when the feature is implemented:

1. `withholdingTax` is optional.
2. If provided, `withholdingTax` must be numeric.
3. The value must be greater than or equal to zero.
4. Withholding tax is only valid for activities where `type = DIVIDEND`.
5. For a valid dividend, `withholdingTax <= grossDividend`.
6. A negative withholding amount is invalid.
7. A positive withholding amount on a zero-value dividend is invalid.
8. If an activity containing withholding tax is changed from `DIVIDEND` to
   another activity type, the update should be rejected until the withholding
   value is removed.

Rejecting an invalid combination is preferred over silently deleting tax data.

## Currency Behavior

The stored `withholdingTax` value uses the same transaction currency as the
activity's existing `currency` field.

For example, `currency = USD` with `withholdingTax = 15` means that 15 USD was
withheld.

The future tax implementation should follow Ghostfolio's existing
currency-conversion approach for reporting values.

The enriched activity response may later expose:

- `withholdingTaxInAssetProfileCurrency`
- `withholdingTaxInBaseCurrency`

These should be derived values rather than additional persisted tax amounts.

The original stored withholding amount should remain unchanged so the value
continues to match the source transaction.

## Proposed DTO Changes

During Iteration 2, the existing activity DTOs would need to accept the new
field.

### CreateOrderDto

```ts
@IsNumber()
@Min(0)
@IsOptional()
withholdingTax?: number | null;
```

### UpdateOrderDto

```ts
@IsNumber()
@Min(0)
@IsOptional()
withholdingTax?: number | null;
```

Cross-field validation that depends on the activity type and gross dividend
should remain in the service/business-logic layer because it uses multiple
activity fields.

## Proposed API Response Values

The stored activity would contain:

`withholdingTax`

The enriched activity response may later include:

- `withholdingTaxRate`
- `withholdingTaxInAssetProfileCurrency`
- `withholdingTaxInBaseCurrency`
- `netDividend`

These should be calculated values instead of additional persisted database
fields.

The existing meaning of Ghostfolio's activity `value` should not be changed as
part of this feature unless a later integration decision explicitly requires
it.

This reduces the risk of changing existing portfolio calculations while adding
tax analytics.

## Example 1 — Dividend With Withholding

```text
type = DIVIDEND
quantity = 10
unitPrice = 10.00
currency = USD
fee = 0
withholdingTax = 15.00
```

```text
grossDividend = 10 × 10.00
              = 100.00 USD

withholdingTax = 15.00 USD

withholdingTaxRate = 15 / 100 × 100
                   = 15%

netDividend = 100.00 - 15.00
            = 85.00 USD
```

## Example 2 — Explicitly No Withholding

```text
type = DIVIDEND
quantity = 10
unitPrice = 10.00
currency = USD
withholdingTax = 0
```

```text
grossDividend = 100.00 USD
withholdingTax = 0.00 USD
withholdingTaxRate = 0%
netDividend = 100.00 USD
```

This means the system knows that no withholding tax was applied.

## Example 3 — Historical Dividend With Unknown Withholding

```text
type = DIVIDEND
quantity = 10
unitPrice = 10.00
currency = USD
withholdingTax = null
```

```text
grossDividend = 100.00 USD
withholdingTax = unknown
withholdingTaxRate = null
netDividend = null
```

The existing dividend remains valid, but the tax analytics layer does not
pretend that the unknown withholding value is zero.

## Import and Backward Compatibility

Existing Ghostfolio dividend activities do not currently contain withholding-tax
information.

The new field therefore needs to be nullable so existing database records,
imports, and historical transactions remain valid.

Older imports that do not contain the field should result in:

`withholdingTax = null`

New imports may provide the field when the source data contains an actual
withholding amount.

The absence of the field must not cause an otherwise valid dividend import to
fail.

## Calculation Precision

The stored field should follow the existing Ghostfolio numeric model for
compatibility.

Financial calculations involving withholding should use the same
high-precision calculation approach already used by Ghostfolio where practical
rather than relying on repeated raw floating-point arithmetic.

Rounding should not be applied unnecessarily during intermediate calculations.

Display and export rounding rules will be defined separately with the tax export
design.

## Edge Cases

The implementation and future tests should cover:

- withholding amount is null
- withholding amount is zero
- normal positive withholding amount
- withholding equal to the full gross dividend
- withholding greater than the gross dividend
- negative withholding amount
- zero-value dividend with positive withholding
- withholding supplied for a non-dividend activity
- imported historical dividend without withholding information
- dividend containing both an activity fee and withholding tax
- foreign-currency dividend
- activity updated from `DIVIDEND` to another activity type

## Acceptance Criteria

This design is complete when:

- the withholding-tax stored field is clearly defined
- null and zero have different documented meanings
- the authoritative stored value is identified
- the withholding rate is defined as a derived value
- gross and net dividend formulas are documented
- withholding tax remains separate from activity fees
- validation rules are defined
- currency behavior is defined
- existing and imported dividends remain backward compatible
- expected DTO and API impact is documented
- important edge cases are identified
- no jurisdiction-specific tax rules are introduced

## Implementation Impact — Iteration 2

The Iteration 2 implementation is expected to affect:

- `prisma/schema.prisma`
- `libs/common/src/lib/dtos/create-order.dto.ts`
- `libs/common/src/lib/dtos/update-order.dto.ts`
- `apps/api/src/app/activities/activities.service.ts`
- `libs/common/src/lib/interfaces/activities.interface.ts`

Import handling may also need to recognize the optional field while remaining
compatible with older files.

Actual source-code changes belong to Iteration 2 and are not part of this design
task.

## Design Decision Summary

```text
Stored:
withholdingTax

Derived:
grossDividend
withholdingTaxRate
netDividend
withholdingTaxInAssetProfileCurrency
withholdingTaxInBaseCurrency
```

The stored withholding amount is the source of truth.

The rate is calculated from the stored amount and gross dividend.

A null value means the withholding information is unknown, while zero means
that the system knows no withholding occurred.

This approach keeps the design simple, traceable, backward compatible, and close
to Ghostfolio's existing activity structure.

## Next Task

The next scheduled tax task is September 17:

**Specify the FIFO capital-gains calculation method.**

That task will define transaction filtering and ordering, acquisition-lot
consumption, partial lot sales, realized gain calculations, traceability, and
edge cases.
