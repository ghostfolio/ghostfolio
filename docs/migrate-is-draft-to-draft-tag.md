# Migrating `isDraft` to a `DRAFT` tag

Follows the precedent set by `Account.isExcluded` → `EXCLUDE_FROM_ANALYSIS`, which retired
that column in two releases: [`79e382a8f`](https://github.com/ghostfolio/ghostfolio/commit/79e382a8f)
made the tag fully functional and deprecated the column, and
[`263e064fd`](https://github.com/ghostfolio/ghostfolio/commit/263e064fd) removed it in a
single migration that backfilled and dropped in one step.

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

## Release 1 — introduce the tag, deprecate `isDraft`

The tag becomes the single source of truth for every read. The column stays in the database
as an exact mirror of the tag, deprecated and unread, so that release 2 is a pure deletion.

### 1 — Introduce the tag

- `TAG_ID_DRAFT` in [config.ts](../libs/common/src/lib/config.ts), added to `TAG_IDS_SYSTEM`
- ``DRAFT: $localize`Draft` `` in [i18n.ts](../libs/ui/src/lib/i18n.ts)
- entry in [seed.mts](../prisma/seed.mts)

The migration creates the `Tag` row and backfills `_OrderToTag` from `isDraft = true`. It
cannot be left to the seed even though `seed.mts` uses `createMany({ skipDuplicates: true })`
and runs on every start — [docker/entrypoint.sh](../docker/entrypoint.sh) runs
`prisma migrate deploy` _before_ `prisma db seed`, so the backfill's foreign key has to
create its own target.

> **Why the backfill ships here and not with the drop.** Reads move to the tag in this same
> release. Without the backfill, every existing `isDraft = true` row would read as _not_ a
> draft the moment it deploys, and a future-dated `BUY` would re-enter the portfolio as a
> holding the user does not own yet. `isExcluded` could defer its backfill because its
> release 1 read `isExcluded || tag`; this migration reads the tag alone, so the data has to
> be there first. Step 6 is what makes that safe to revert.

Rename and delete guarding in the admin control panel comes free —
[tags.controller.ts:73](../apps/api/src/app/endpoints/tags/tags.controller.ts#L73) already
rejects anything `isSystemTag` matches.

### 2 — Make it activity-only

`DRAFT` is the first system tag not assignable to accounts.

- **client** — filter it out of `tagsAvailable` in [create-or-update-account-dialog.component.ts](../apps/client/src/app/pages/accounts/create-or-update-account-dialog/create-or-update-account-dialog.component.ts)
- **server** — no guard exists today. `tagService.validateTagIds` only checks ownership, and
  [account.service.ts](../apps/api/src/app/account/account.service.ts) connects `tagIds`
  straight through on create and update. Both go through `validateTagIdsForAccount` instead.

### 3 — Helpers

Mirroring [account.helper.ts](../apps/api/src/helper/account.helper.ts) field for field:

- `isDraftActivity({ tags })` in [helper.ts](../libs/common/src/lib/helper.ts), next to
  `isAccountExcluded` — the shared read predicate
- `WHERE_ACTIVITY_NOT_DRAFT` in [activity.helper.ts](../apps/api/src/helper/activity.helper.ts),
  next to `WHERE_ACCOUNT_NOT_EXCLUDED` — the Prisma equivalent
- `isActivityInFuture({ date })`, next to `isAccountBalanceInFuture` — the date predicate that
  keeps data gathering off the tag
- `isDraftTagToBeAssigned({ date, storedDate, type })` — the transition rule above

### 4 — Auto-assign on write

Apply the transition rule in `createActivity`, `updateActivity` and the import dry run.

`updateActivity` needs the stored date to evaluate the rule. The controller already loads the
activity as `originalActivity` to authorize the request
([activities.controller.ts:316](../apps/api/src/app/activities/activities.controller.ts#L316)),
so it passes the date down rather than the service issuing a second query.

### 5 — Switch reads to the tag

The DB filter at [activities.service.ts:639](../apps/api/src/app/activities/activities.service.ts#L639)
becomes `WHERE_ACTIVITY_NOT_DRAFT`.

> **Gotcha:** `where.tags` is already assigned at
> [:766](../apps/api/src/app/activities/activities.service.ts#L766) and `where.OR` at
> [:764](../apps/api/src/app/activities/activities.service.ts#L764). A second assignment
> silently clobbers the first, so this must go through the existing `andConditions` array.

Field reads to convert:

- [activities-table.component.ts:280](../libs/ui/src/lib/activities-table/activities-table.component.ts#L280) and [:360](../libs/ui/src/lib/activities-table/activities-table.component.ts#L360)
- badge and ICS gate at [activities-table.component.html:180](../libs/ui/src/lib/activities-table/activities-table.component.html#L180) and [:516](../libs/ui/src/lib/activities-table/activities-table.component.html#L516)
- [portfolio.service.ts:2104](../apps/api/src/app/portfolio/portfolio.service.ts#L2104)

The two gather gates ([activities.controller.ts:290](../apps/api/src/app/activities/activities.controller.ts#L290)
and [activities.service.ts:1005](../apps/api/src/app/activities/activities.service.ts#L1005))
convert to `isActivityInFuture` instead — they are date questions, not tag questions.

In the two count loops the guard **moves** rather than disappears — off the record count,
onto the money sums:

- [account.service.ts:242](../apps/api/src/app/account/account.service.ts#L242) —
  count only, so the loop collapses to `activitiesCount = account.activities.length`.
  Its `include` needs nothing added.
- [portfolio.service.ts:195-232](../apps/api/src/app/portfolio/portfolio.service.ts#L195-L232) —
  the count becomes unconditional, and the `DIVIDEND` / `INTEREST` cases gain the draft
  guard the count gives up (see below). This loop reads raw Prisma rows, so its `include`
  at [:178](../apps/api/src/app/portfolio/portfolio.service.ts#L178) needs `tags` added to
  `activities` — the existing `tags: true` there is the _account's_ tags, not the
  activities'.

#### Fixing the dividend and interest sums

Today that loop iterates an unfiltered `include` and gates only the count on `isDraft`.
`dividendInBaseCurrency` and `interestInBaseCurrency` are not gated, so a future-dated
`DIVIDEND` already contributes money the user has not received. Both sums move behind the
draft check, which is what makes the record-vs-money principle hold in both directions.

`INTEREST` is exempt from auto-assignment, so the guard there only bites when the user
tags an interest activity by hand — applied anyway for consistency.

### 6 — Reduce `isDraft` to a mirror

The column is no longer computed from the date at any write site. It is written as
`isDraftActivity({ tags })` over the tag list the same statement persists, which makes it
exact rather than merely close.

This is what carries the release. It keeps the deprecated field truthful for API consumers
during the deprecation window, and it makes release 1 revertible by deploy rather than by
database restore: roll the code back and the column is still correct for every row, because
every write since the deploy mirrored the tag and the backfill covered everything before it.

Lifting the computation out of the profile-editability `else` at
[activities.service.ts:991-1005](../apps/api/src/app/activities/activities.service.ts#L991-L1005)
is what un-exempts `MANUAL` + `BUY`. That is safe now precisely because nothing reads the
column any more.

Mark it in [schema.prisma](../prisma/schema.prisma), as `isExcluded` was:

```prisma
/// @deprecated Use the "Draft" tag (`TAG_ID_DRAFT`) instead
isDraft Boolean @default(false)
```

### 7 — Visibility

- [user.service.ts:198](../apps/api/src/app/user/user.service.ts#L198) narrows `user.tags` to
  _only_ `EXCLUDE_FROM_ANALYSIS` for Basic subscribers. `DRAFT` must be added, or Basic users
  get auto-tagged drafts they cannot untag.
- `DRAFT` **stays visible** in the portfolio filter list. The exclusion of
  `EXCLUDE_FROM_ANALYSIS` at [portfolio-filter-form.util.ts:110](../libs/ui/src/lib/portfolio-filter-form/portfolio-filter-form.util.ts#L110)
  is not extended to it — filtering for uncertain activities is the point of the tag.

### 8 — Changelog

```markdown
### Added

- Added the _Draft_ tag, assigned automatically to activities dated in the future

### Changed

- Deprecated the `isDraft` attribute of the activity in favor of the _Draft_ tag

### Fixed

- Fixed the dividend and interest of an account by excluding draft activities
```

## Release 2 — remove `isDraft`

Ships once release 1 has been out and proven. The data moved in release 1, so this migration
only drops:

```sql
-- DropIndex
DROP INDEX "Order_isDraft_idx";

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "isDraft";
```

Keeping the drop in its own release is the entire point of the split: it is the one step that
cannot be undone by a deploy.

Then remove the field:

- `isDraft` and `@@index([isDraft])` from [schema.prisma](../prisma/schema.prisma)
- the mirror writes in `createActivity`, `updateActivity` and the import dry run
- `Omit` list in [export-response.interface.ts:18](../libs/common/src/lib/interfaces/responses/export-response.interface.ts#L18)
- [portfolio-calculator-test-utils.ts:15](../apps/api/src/app/portfolio/calculator/portfolio-calculator-test-utils.ts#L15)
- the synthetic `isDraft: false` literals at [activities.service.ts:530](../apps/api/src/app/activities/activities.service.ts#L530) and [import.service.ts:168](../apps/api/src/app/import/import.service.ts#L168)
- 5 occurrences in [activities-table.component.stories.ts](../libs/ui/src/lib/activities-table/activities-table.component.stories.ts)

`Activity extends Order` loses `isDraft` with the schema. It is dropped from the response
rather than recomputed — the client already receives `tags` and already derives
`isExcludedFromAnalysis` that way, so deriving `isDraft` identically is the consistent end
state.

Changelog, following the `isExcluded` precedent:

```markdown
### Changed

- Removed the deprecated `isDraft` attribute of the activity in favor of the _Draft_ tag including a data migration
```

## Behavioural changes to call out in the pull request

**Every existing draft becomes visible and removable.** Nothing recomputes the column today,
so a future-dated activity whose date has since passed is excluded from the portfolio
**permanently**. After the backfill those rows carry the _Draft_ tag and are still excluded —
but the user can now see why, and remove it. That is a fix, though it will look like a change
to anyone affected.

**`activitiesCount` starts including drafts**, which changes a visible number in the accounts
table and enables the **Delete account** guard for accounts holding only drafts.

**A `MANUAL` + `BUY` activity can now become a draft**, where the accidental carve-out
previously prevented it on update.
