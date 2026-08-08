# Migrating `isDraft` to a `DRAFT` tag

Follows the precedent set by `Account.isExcluded` → `EXCLUDE_FROM_ANALYSIS`, which retired
that column in two releases: [`79e382a8f`](https://github.com/ghostfolio/ghostfolio/commit/79e382a8f)
made the tag fully functional and deprecated the column, and
[`263e064fd`](https://github.com/ghostfolio/ghostfolio/commit/263e064fd) removed it in a
single migration that backfilled and dropped in one step.

**Status:** release 1 is implemented. Release 2 is the remaining work.

## Motivation

`Order.isDraft` was a persisted snapshot of "the date is in the future", computed at write
time in three places that did not agree:

| Site                      | Definition                                                   |
| ------------------------- | ------------------------------------------------------------ |
| `createActivity`          | `FEE/INTEREST/LIABILITY → false`, else `date > endOfToday()` |
| `updateActivity`          | same, **plus** `MANUAL` + `BUY → false`                      |
| `previewImport` (dry run) | `date > endOfToday()`, no type carve-out                     |

The `MANUAL` + `BUY` carve-out was accidental. The `if` it lived in is about whether
`SymbolProfile.name` is editable (custom asset profiles), and the `isDraft` computation
merely sat inside its `else`. A custom asset you plan to buy next month is a legitimate
draft, so this carve-out is gone.

Nothing ever recomputed the column. No job flipped a stored `isDraft = true` once the date
passed, while `getActivities` defaults to `includeDrafts: false`. A future-dated `BUY` was
therefore excluded from the portfolio **permanently**, not just until its date arrived.

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

Two consequences of keying the rule on the date transition alone, both intentional:

- **Changing only the type does not assign the tag.** A future-dated `FEE` edited into a
  `BUY` keeps its date, so `storedDate` is already in the future and the rule declines. The
  old code recomputed from the date and would have marked it a draft. Widening the rule to
  the type transition would mean re-tagging activities the user untagged, which is the
  behaviour the stored-date comparison exists to prevent.
- **An update that does not send `tags` leaves them untouched.** `tags` is optional in
  `UpdateOrderDto`, and treating an absent list as an empty one would let a partial update
  drop the tag with no way for the rule to restore it. Such an update still gains the tag
  when its date newly moves into the future, via `connect` rather than `set`.

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
[accounts-table.component.html:333](../libs/ui/src/lib/accounts-table/accounts-table.component.html#L333)
disables the **Delete account** button via `element.activitiesCount > 0`. An account holding
only drafts reported `0` before, so Delete was enabled;
[deleteAccount](../apps/api/src/app/account/account.service.ts#L214) calls `account.delete()`
with no guard, and `Order.account` is an optional relation with no `onDelete`
([schema.prisma:177](../prisma/schema.prisma#L177)), so Prisma's default `SetNull` silently
detached those activities.

It also reconciles two counts that disagreed: `user.activitiesCount` is a raw
`_count.activities` ([user.service.ts:316](../apps/api/src/app/user/user.service.ts#L316))
and already included drafts, while the per-account counts did not.

The two tags therefore stay **independent predicates** — do not group them into a shared
"excluding tags" set. `includeDrafts` survives as a `getActivities` parameter, simply
re-implemented as a tag predicate instead of `where.isDraft = false`.

This was already the behaviour before the migration: `getSummary` omits `includeDrafts`,
so it defaults to `false` and drafts are dropped at the DB before the excluded /
non-excluded split runs.

**Data gathering stays derived from the date, never from a tag.** There is no market price
to fetch for a date that has not happened, so no tag decision may reach that code path.
This is the one piece of `isDraft` that must _not_ become user-owned.

## `DRAFT` is per-activity, never per-collection

`DRAFT` is the first system tag that qualifies a single record rather than a container, so
every path that assigns tags to a _set_ of records has to refuse it. There are three:

| Path                                             | Target                      | Guard                                |
| ------------------------------------------------ | --------------------------- | ------------------------------------ |
| `accountService.createAccount` / `updateAccount` | an account                  | `validateTagIdsWithoutDraftTag`      |
| `activitiesService.assignTags`                   | every activity of a holding | `validateTagIdsWithoutDraftTag`      |
| `activitiesService.updateActivity`               | one activity                | none — this is where `DRAFT` belongs |

`tagService.validateTagIds` only checks ownership, and system tags have `userId = null`, so
it accepts `DRAFT` by design. `validateTagIdsWithoutDraftTag` wraps it with the rejection
and is what the first two paths call.

`assignTags` needs more than a guard. It writes `tags: { set: [...] }` over every activity
of a holding, so even with `DRAFT` rejected on input the `set` would drop a tag an
individual activity already carries. It therefore loads each activity's tags and carries
`DRAFT` over per row. This is also the write path most easily forgotten — it is the third
place the deprecated column has to be mirrored, and the reason the mirror is worth keeping
in mind at every `tags` write rather than only at the two obvious ones.

Both client dialogs that feed these paths filter `DRAFT` out of `tagsAvailable`:
[create-or-update-account-dialog.component.ts](../apps/client/src/app/pages/accounts/create-or-update-account-dialog/create-or-update-account-dialog.component.ts)
and
[holding-detail-dialog.component.ts](../apps/client/src/app/components/holding-detail-dialog/holding-detail-dialog.component.ts).

## Release 1 — introduce the tag, deprecate `isDraft` (done)

The tag is the single source of truth for every read. The column stays in the database
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

See [`DRAFT` is per-activity, never per-collection](#draft-is-per-activity-never-per-collection)
above.

### 3 — Helpers

Mirroring [account.helper.ts](../apps/api/src/helper/account.helper.ts) field for field:

- `isDraftActivity({ tags })` in [helper.ts](../libs/common/src/lib/helper.ts), next to
  `isAccountExcluded` — the shared read predicate
- `WHERE_ACTIVITY_NOT_DRAFT` in [activity.helper.ts](../apps/api/src/helper/activity.helper.ts),
  next to `WHERE_ACCOUNT_NOT_EXCLUDED` — the Prisma equivalent
- `isActivityInFuture({ date })`, next to `isAccountBalanceInFuture` — the date predicate that
  keeps data gathering off the tag
- `isDraftTagToBeAssigned({ date, storedDate, type })` — the transition rule above
- `getTagsWithDraftTag({ date, draftTag, storedDate, tags, type })` — applies that rule to a
  tag list. Generic over the tag shape, because the write paths pass `{ id }` while the
  import preview needs the full `Tag` for its response

Both date-dependent helpers take an injectable `endOfTodayDate` so the rule is testable
without freezing the clock; see [activity.helper.spec.ts](../apps/api/src/helper/activity.helper.spec.ts).

### 4 — Auto-assign on write

Apply the transition rule via `getTagsWithDraftTag` in `createActivity`, `updateActivity` and
the import dry run.

`updateActivity` needs the stored date to evaluate the rule. The controller already loads the
activity as `originalActivity` to authorize the request
([activities.controller.ts:317](../apps/api/src/app/activities/activities.controller.ts#L317)),
so it passes the date down rather than the service issuing a second query.

The import dry run resolves the `Tag` row from the user's tag list once, above the loop, and
falls back to the compile-time constant. Degrading to "no tag" on a lookup miss would make the
preview disagree with what the real run writes, which is the divergence this step removes.

### 5 — Switch reads to the tag

The DB filter in `getActivities` becomes `WHERE_ACTIVITY_NOT_DRAFT`.

> **Gotcha 1:** `where.tags` and `where.OR` are already assigned further down in
> `getActivities`. A second assignment silently clobbers the first, so this must go through
> the existing `andConditions` array.

> **Gotcha 2:** `includeDrafts` defaults to `false`, so pushing the exclusion
> unconditionally makes the tag unfilterable — the tag filter pushes `tags: { some: DRAFT }`
> into the same `andConditions`, and the two contradict. The exclusion is skipped when
> `filtersByTag` contains `TAG_ID_DRAFT`. Without this, step 7's "DRAFT stays visible in the
> filter list" yields an empty portfolio rather than the drafts.

Field reads converted:

- `isDraftActivity` in [activities-table.component.ts](../libs/ui/src/lib/activities-table/activities-table.component.ts),
  exposed to the template as a public field for the badge and the ICS gate
- `getSumOfActivityType` in [portfolio.service.ts](../apps/api/src/app/portfolio/portfolio.service.ts)

The two gather gates ([activities.controller.ts:291](../apps/api/src/app/activities/activities.controller.ts#L291)
and the `else` branch of `updateActivity`) convert to `isActivityInFuture` instead — they are
date questions, not tag questions.

In the two count loops the guard **moves** rather than disappears — off the record count,
onto the money sums:

- [account.service.ts:245](../apps/api/src/app/account/account.service.ts#L245) —
  count only, so the loop collapses to `activitiesCount = account.activities.length`.
  Its `include` needs nothing added.
- [portfolio.service.ts:216](../apps/api/src/app/portfolio/portfolio.service.ts#L216) —
  the count becomes unconditional, and the `DIVIDEND` / `INTEREST` cases gain the draft
  guard the count gives up (see below). This loop reads raw Prisma rows, so its `include`
  needs `tags` added to `activities` — the existing `tags: true` there is the _account's_
  tags, not the activities'. Narrowed to `where: { id: TAG_ID_DRAFT }, select: { id: true }`,
  since the loop only asks one yes/no question and the alternative materialises every tag
  row of every activity on each request.

#### Fixing the dividend and interest sums

That loop iterated an unfiltered `include` and gated only the count on `isDraft`.
`dividendInBaseCurrency` and `interestInBaseCurrency` were not gated, so a future-dated
`DIVIDEND` contributed money the user has not received. Both sums move behind the
draft check, which is what makes the record-vs-money principle hold in both directions.

`INTEREST` is exempt from auto-assignment, so the guard there only bites when the user
tags an interest activity by hand — applied anyway for consistency.

### 6 — Reduce `isDraft` to a mirror

The column is no longer computed from the date at any write site. It is written as
`isDraftActivity({ tags })` over the tag list the same statement persists, which makes it
exact rather than merely close. **Four** statements write it:

| Site                      | Mirror                                                                                                            |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `createActivity`          | `isDraftActivity({ tags: tagsToConnect })`                                                                        |
| `updateActivity`          | `isDraftActivity({ tags: tagsToSet })`, or `true` when the date newly moves into the future and no tags were sent |
| `assignTags`              | the activity's own draft state, carried over                                                                      |
| `previewImport` (dry run) | `isDraftActivity({ tags: previewTags })` — response only, nothing persisted                                       |

This is what carries the release. It keeps the deprecated field truthful for API consumers
during the deprecation window, and it makes release 1 revertible by deploy rather than by
database restore: roll the code back and the column is still correct for every row, because
every write since the deploy mirrored the tag and the backfill covered everything before it.
A single tag write that skips the mirror breaks that guarantee for the rows it touches, which
is why the table above is exhaustive rather than illustrative.

Lifting the computation out of the profile-editability `else` in `updateActivity` is what
un-exempts `MANUAL` + `BUY`. That is safe now precisely because nothing reads the column.

Marked in [schema.prisma](../prisma/schema.prisma), as `isExcluded` was:

```prisma
/// @deprecated Use the "Draft" tag (`TAG_ID_DRAFT`) instead
isDraft Boolean @default(false)
```

### 7 — Visibility

- [user.service.ts:198](../apps/api/src/app/user/user.service.ts#L198) narrowed `user.tags` to
  _only_ `EXCLUDE_FROM_ANALYSIS` for Basic subscribers. `DRAFT` is added, or Basic users
  get auto-tagged drafts they cannot untag.
- `DRAFT` **stays visible** in the portfolio filter list. The exclusion of
  `EXCLUDE_FROM_ANALYSIS` at [portfolio-filter-form.util.ts:110](../libs/ui/src/lib/portfolio-filter-form/portfolio-filter-form.util.ts#L110)
  is not extended to it — filtering for uncertain activities is the point of the tag. Leaving
  that list alone is necessary but not sufficient; see gotcha 2 in step 5.

### 8 — Changelog

```markdown
### Added

- Added the _Draft_ tag, assigned automatically to activities dated in the future

### Changed

- Deprecated the `isDraft` attribute of the activity in favor of the _Draft_ tag
- Changed the activities count of an account to include draft activities
- Extended the _Draft_ tag to activities with a custom asset profile of type `BUY`

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

- `isDraft` and `@@index([isDraft])` from [schema.prisma](../prisma/schema.prisma) —
  the index has been dead since release 1 moved the predicate onto `_OrderToTag`, but it is
  dropped here with the column rather than separately
- the four mirror writes listed in release 1 step 6
- `Omit` list in [export-response.interface.ts:18](../libs/common/src/lib/interfaces/responses/export-response.interface.ts#L18)
- [portfolio-calculator-test-utils.ts:15](../apps/api/src/app/portfolio/calculator/portfolio-calculator-test-utils.ts#L15)
- the synthetic `isDraft: false` literals at [activities.service.ts:545](../apps/api/src/app/activities/activities.service.ts#L545) and [import.service.ts:171](../apps/api/src/app/import/import.service.ts#L171)
- 5 occurrences in [activities-table.component.stories.ts](../libs/ui/src/lib/activities-table/activities-table.component.stories.ts)

`git grep -n isDraft` should come back empty apart from the historical migrations under
`prisma/migrations`, which are never edited.

`Activity extends Order` loses `isDraft` with the schema. It is dropped from the response
rather than recomputed — the client already receives `tags` and already derives
`isExcludedFromAnalysis` that way, so deriving `isDraft` identically is the consistent end
state.

Changelog, following the `isExcluded` precedent:

```markdown
### Changed

- Removed the deprecated `isDraft` attribute of the activity in favor of the _Draft_ tag including a data migration
```

## Follow-ups, not part of either release

Found while migrating, unrelated to the column:

- **`getAccounts` materialises every activity to take its `.length`.**
  [account.service.ts](../apps/api/src/app/account/account.service.ts) uses
  `include: { activities: true }` and, since release 1 collapsed the loop, reads nothing but
  the array length before `delete result.activities`. `_count: { select: { activities: true } }`
  returns the same number from the database.
- **`hasDrafts` in [activities-table.component.ts:143](../libs/ui/src/lib/activities-table/activities-table.component.ts#L143)
  is never assigned.** It has no `@Input` and no writer, yet gates the bulk _Export Drafts as
  ICS_ action, which is therefore permanently disabled. Predates this migration;
  `hasDrafts = data.some(isDraftActivity)` now fixes it.

## Behavioural changes to call out in the pull request

**Every existing draft becomes visible and removable.** Nothing recomputed the column, so a
future-dated activity whose date has since passed was excluded from the portfolio
**permanently**. After the backfill those rows carry the _Draft_ tag and are still excluded —
but the user can now see why, and remove it. That is a fix, though it will look like a change
to anyone affected.

**`activitiesCount` starts including drafts**, which changes a visible number in the accounts
table and enables the **Delete account** guard for accounts holding only drafts.

**A `MANUAL` + `BUY` activity can now become a draft**, where the accidental carve-out
previously prevented it on update.
