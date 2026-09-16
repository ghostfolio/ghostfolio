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