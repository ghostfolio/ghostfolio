# Migrating `isDraft` to a `DRAFT` tag

Follows the precedent set by `Account.isExcluded` → `EXCLUDE_FROM_ANALYSIS`
(commit `263e064fd`, migration `20260801103609_removed_is_excluded_from_account`).

## Motivation

`Order.isDraft` is a persisted snapshot of "the date is in the future", computed at write
time in three places that do not agree:

| Site                                                                                            | Definition                                                   |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| [activities.service.ts:263](../apps/api/src/app/activities/activities.service.ts#L263) (create) | `FEE/INTEREST/LIABILITY → false`, else `date > endOfToday()` |
| [activities.service.ts:993](../apps/api/src/app/activities/activities.service.ts#L993) (update) | same, **plus** `MANUAL` + `BUY → false`                      |
| [import.service.ts:734](../apps/api/src/app/import/import.service.ts#L734) (dry run)            | `date > endOfToday()`, no type carve-out                     |

The `MANUAL` + `BUY` carve-out is accidental. The `if` it lives in is about whether
`SymbolProfile.name` is editable (custom asset profiles), and the `isDraft` computation
merely sits inside its `else`. A custom asset you plan to buy next month is a legitimate
draft, so this carve-out goes away.

Nothing ever recomputes the column. No job flips a stored `isDraft = true` once the date
passes, while `getActivities` defaults to `includeDrafts: false`
([activities.service.ts:639](../apps/api/src/app/activities/activities.service.ts#L639)).
A future-dated `BUY` is therefore excluded from the portfolio **permanently**, not just
until its date arrives.

The goal is that the user, not the system, owns this state after creation. A flag
recomputed on every write cannot express that; a tag can.

## The rule

> The **Draft** tag is added when an activity's date _newly becomes_ a future date, unless
> its type is FEE, INTEREST or LIABILITY. It is never removed automatically. The user may
> add or remove it freely, on future and past activities alike.

"Newly becomes" is what makes this one rule rather than separate create and update cases:

- **create / import** — `date > endOfToday()`
- **update** — `date > endOfToday() && storedDate <= endOfToday()`

The stored-date comparison is essential. Without it, correcting a fee on a future-dated
activity the user deliberately untagged would silently re-tag it, undoing their choice.

## Semantics

`DRAFT` is **stronger** than `EXCLUDE_FROM_ANALYSIS`, not equivalent to it:

|                         | Appears in portfolio analysis | Appears in "Excluded" summary | Counted in `activitiesCount` |
| ----------------------- | ----------------------------- | ----------------------------- | ---------------------------- |
| normal                  | yes                           | no                            | yes                          |
| `EXCLUDE_FROM_ANALYSIS` | no                            | yes                           | yes                          |
| `DRAFT`                 | no                            | no                            | **yes**                      |

The guiding principle: **record counts include drafts, money aggregates do not.**
`activitiesCount` answers "how many records are in this account" — a draft is a record.
`totalOfExcludedActivities` answers "how much money" — a draft has not happened.

Counting drafts also closes a hole in a delete guard.
[accounts-table.component.html:327](../libs/ui/src/lib/accounts-table/accounts-table.component.html#L327)
disables the **Delete account** button via `element.activitiesCount > 0`. An account holding
only drafts reports `0` today, so Delete is enabled;
[deleteAccount](../apps/api/src/app/account/account.service.ts#L202) calls `account.delete()`
with no guard, and `Order.account` is an optional relation with no `onDelete`
([schema.prisma:29](../prisma/schema.prisma#L29)), so Prisma's default `SetNull` silently
detaches those activities.

It also reconciles two counts that disagree today: `user.activitiesCount` is a raw
`_count.activities` ([user.service.ts:314](../apps/api/src/app/user/user.service.ts#L314))
and already includes drafts, while the per-account counts do not.

The two tags therefore stay **independent predicates** — do not group them into a shared
"excluding tags" set. `includeDrafts` survives as a `getActivities` parameter, simply
re-implemented as a tag predicate instead of `where.isDraft = false`.

This is already today's behaviour:
[portfolio.service.ts:1883](../apps/api/src/app/portfolio/portfolio.service.ts#L1883)
omits `includeDrafts`, so it defaults to `false` and drafts are dropped at the DB before
the excluded / non-excluded split runs. The migration preserves it.

**Data gathering stays derived from the date, never from a tag.** There is no market price
to fetch for a date that has not happened, so no tag decision may reach that code path.
This is the one piece of `isDraft` that must _not_ become user-owned.

## Steps

### 1 — Introduce the tag

- `TAG_ID_DRAFT` in [config.ts:343](../libs/common/src/lib/config.ts#L343), added to `TAG_IDS_SYSTEM`
- ``DRAFT: $localize`Draft` `` in [i18n.ts:22](../libs/ui/src/lib/i18n.ts#L22)
- entry in [seed.mts:11](../prisma/seed.mts#L11)

Rename and delete guarding in the admin control panel comes free —
[tags.controller.ts:73](../apps/api/src/app/endpoints/tags/tags.controller.ts#L73) already
rejects anything `isSystemTag` matches.

### 2 — Make it activity-only

`DRAFT` is the first system tag not assignable to accounts.

- **client** — filter it out of `tagsAvailable` in [create-or-update-account-dialog.component.ts:94](../apps/client/src/app/pages/accounts/create-or-update-account-dialog/create-or-update-account-dialog.component.ts#L94)
- **server** — no guard exists today. `tagService.validateTagIds` only checks ownership, and
  [account.service.ts:173](../apps/api/src/app/account/account.service.ts#L173) and
  [:313](../apps/api/src/app/account/account.service.ts#L313) connect `tagIds` straight
  through. Both need an explicit rejection.

### 3 — Read helper

`isDraftActivity({ tags })` in [helper.ts](../libs/common/src/lib/helper.ts#L489), mirroring
`isAccountExcluded` directly above it.

### 4 — Auto-assign on write

Apply the transition rule in `createActivity`, `updateActivity` and `import.service`.

> **Leave the existing `isDraft` computation exactly where it is.** Add the tag write
> _beside_ it; do not refactor it yet. Lifting it out of the profile-editability `else` at
> [activities.service.ts:935-993](../apps/api/src/app/activities/activities.service.ts#L935-L993)
> is what un-exempts `MANUAL` + `BUY`, and doing that here would change what the column
> stores — a future-dated MANUAL BUY would start dropping out of the portfolio on update.
> That refactor belongs in step 5, alongside removing the column writes.

So the column keeps its legacy rule while the tag gets the new one. They diverge by design:
the tag is what step 5 promotes to source of truth, and it will have been maintained
correctly since this step.

Also move the Basic-subscriber tag visibility fix from step 8 forward into this step —
otherwise Basic users spend a release being auto-tagged with a tag they cannot see.

### 5 — Switch reads to the tag

The DB filter at [activities.service.ts:639](../apps/api/src/app/activities/activities.service.ts#L639)
becomes `tags: { none: { id: TAG_ID_DRAFT } }`.

> **Gotcha:** `where.tags` is already assigned at
> [:757](../apps/api/src/app/activities/activities.service.ts#L757) and `where.OR` at
> [:755](../apps/api/src/app/activities/activities.service.ts#L755). A second assignment
> silently clobbers the first, so this must go through the existing `andConditions` array.

Field reads to convert:

- [activities-table.component.ts:280](../libs/ui/src/lib/activities-table/activities-table.component.ts#L280) and [:360](../libs/ui/src/lib/activities-table/activities-table.component.ts#L360)
- badge and ICS gate at [activities-table.component.html:180](../libs/ui/src/lib/activities-table/activities-table.component.html#L180) and [:511](../libs/ui/src/lib/activities-table/activities-table.component.html#L511)
- gather gate at [activities.controller.ts:290](../apps/api/src/app/activities/activities.controller.ts#L290)
- [portfolio.service.ts:2076](../apps/api/src/app/portfolio/portfolio.service.ts#L2076)

In the two count loops the guard **moves** rather than disappears — off the record count,
onto the money sums:

- [account.service.ts:231-236](../apps/api/src/app/account/account.service.ts#L231-L236) —
  count only, so the loop collapses to `activitiesCount = account.activities.length`.
  Its `include` needs nothing added.
- [portfolio.service.ts:195-232](../apps/api/src/app/portfolio/portfolio.service.ts#L195-L232) —
  the count becomes unconditional, and the `DIVIDEND` / `INTEREST` cases gain the draft
  guard the count gives up (see below). This loop reads raw Prisma rows, so its `include`
  at [:176](../apps/api/src/app/portfolio/portfolio.service.ts#L176) needs `tags` added to
  `activities` — the existing `tags: true` there is the _account's_ tags, not the
  activities'.

#### Fixing the dividend and interest sums

Today that loop iterates an unfiltered `include` and gates only the count on `isDraft`.
`dividendInBaseCurrency` and `interestInBaseCurrency` are not gated, so a future-dated
`DIVIDEND` already contributes money the user has not received. Both sums move behind the
draft check, which is what makes the record-vs-money principle hold in both directions.

`INTEREST` is exempt from auto-assignment, so the guard there only bites when the user
tags an interest activity by hand — applied anyway for consistency.

### 6 — Migrate and drop

This is an expand / migrate / contract sequence, so it splits in two. Join table is
`_OrderToTag`, `A` = order, `B` = tag, PK `(A, B)`.

#### 6a — Create and backfill (ships **with step 4**, before any read switches)

```sql
-- Create the "DRAFT" tag if it does not exist yet
INSERT INTO "Tag" ("id", "name")
VALUES ('<uuid>', 'DRAFT')
ON CONFLICT DO NOTHING;

-- Migrate activities with "isDraft" to the "DRAFT" tag
INSERT INTO "_OrderToTag" ("A", "B")
SELECT
  "id",
  '<uuid>'
FROM "Order"
WHERE "isDraft" = true
ON CONFLICT DO NOTHING;
```

> **Ordering constraint:** the backfill must land before step 5. Existing rows carry
> `isDraft = true` but no tag, so switching reads first would make every existing draft
> non-draft and drop them straight into portfolio calculations.

#### 6b — Drop the column (ships **after** step 5 has been released and proven)

```sql
-- DropIndex
DROP INDEX "Order_isDraft_idx";

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "isDraft";
```

Remove `isDraft` and `@@index([isDraft])` from [schema.prisma](../prisma/schema.prisma#L187).

Keeping this in its own release means step 5 can be reverted with a deploy rather than a
database restore, since the column is still there and still dual-written.

### 7 — Types and fixtures

`Activity extends Order` loses `isDraft`. Drop it from the response rather than recomputing
it — the client already receives `tags` and already derives `isExcludedFromAnalysis` that
way, so deriving `isDraft` identically is the consistent end state.

- `Omit` list in [export-response.interface.ts:18](../libs/common/src/lib/interfaces/responses/export-response.interface.ts#L18)
- [portfolio-calculator-test-utils.ts:15](../apps/api/src/app/portfolio/calculator/portfolio-calculator-test-utils.ts#L15)
- 5 occurrences in [activities-table.component.stories.ts](../libs/ui/src/lib/activities-table/activities-table.component.stories.ts)

### 8 — Visibility

- [user.service.ts:197](../apps/api/src/app/user/user.service.ts#L197) narrows `user.tags` to
  _only_ `EXCLUDE_FROM_ANALYSIS` for Basic subscribers. `DRAFT` must be added, or Basic users
  get auto-tagged drafts they cannot untag. **Ship this with step 4**, not here — it needs to
  land in the same release that starts assigning the tag.
- `DRAFT` **stays visible** in the portfolio filter list. The exclusion of
  `EXCLUDE_FROM_ANALYSIS` at [portfolio-filter-form.util.ts:110](../libs/ui/src/lib/portfolio-filter-form/portfolio-filter-form.util.ts#L110)
  is not extended to it — filtering for uncertain activities is the point of the tag.

### 9 — Changelog

Under `### Changed`, following the `isExcluded` precedent:

> Removed the deprecated `isDraft` attribute of the activity in favor of the _Draft_ tag
> including a data migration

The dividend and interest correction is a pre-existing, already-released defect, so it earns
its own entry under `### Fixed`:

> Fixed the dividend and interest of an account to disregard draft activities

## Behavioural change to call out in the pull request

Nothing today recomputes a stored `isDraft`, so a future-dated activity whose date has since
passed is excluded from the portfolio permanently. After the migration those rows carry the
`DRAFT` tag and remain excluded — but the user can now see why, and remove it.

That is a fix, though it will look like a change to anyone affected.

## Release sequence

The visibility boundary is the `Tag` row, not the code:
[tag.service.ts:72-81](../apps/api/src/services/tag/tag.service.ts#L72-L81) returns every tag
with `userId IS NULL`, so the moment that row exists the tag appears in every user's selector
and in the admin tag management. Everything else can ship dark.

| Release   | Contents                                                       | What the user sees                                                                        |
| --------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| **A + B** | steps 1, 2, 3, 4, 6a, and the Basic-subscriber fix from step 8 | a new _Draft_ tag, auto-assigned; no behaviour change, `isDraft` still governs every read |
| **C**     | steps 5, 7, 9, rest of step 8                                  | behaviour moves to the tag                                                                |
| **D**     | step 6b                                                        | nothing                                                                                   |

A and B are combined deliberately. On its own, A (the config constant, the i18n label,
`isDraftActivity`, and the account guards) is genuinely invisible — `isSystemTag` cannot match
a row that does not exist, the label names a tag nobody can select, the helper has no callers,
and the guards reject a tag ID no row carries. But it is also entirely unreferenced code, so
shipping it alone buys nothing. B is where the de-risking actually happens: the tag row and
the backfill land while `isDraft` still governs every read, which makes C a pure deploy that
reverts without touching the database.

The property that makes A + B safe is that **step 4 does not modify the existing `isDraft`
computation** — see the warning there. If that refactor leaks into this release, the release
is no longer inert.

C and D can be merged if fewer releases are preferred, at the cost of the rollback property
described in 6b.
