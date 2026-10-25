import { CashManagementService } from '@ghostfolio/api/app/account-balance/cash-management.service';
import { PortfolioChangedEvent } from '@ghostfolio/api/events/portfolio-changed.event';
import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { DataGatheringService } from '@ghostfolio/api/services/queues/data-gathering/data-gathering.service';
import {
  DATA_GATHERING_QUEUE_PRIORITY_HIGH,
  TAG_ID_EXCLUDE_FROM_ANALYSIS
} from '@ghostfolio/common/config';

import {
  BadRequestException,
  ConflictException,
  Injectable
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DataSource, Prisma } from '@prisma/client';
import { Big } from 'big.js';
import { createHash, randomUUID } from 'node:crypto';

import { PortfolioRestoreDto } from './portfolio-restore.dto';

@Injectable()
export class PortfolioRestoreService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cash: CashManagementService,
    private readonly emitter: EventEmitter2,
    private readonly gathering: DataGatheringService
  ) {}

  public async run(
    input: PortfolioRestoreDto,
    userId: string,
    preview: boolean
  ) {
    const result = await this.prisma.$transaction(
      async (tx) => {
        // Serializes restores and gives the preview a stable view of this user's data.
        await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
        const destination = await tx.account.findMany({
          where: { userId },
          orderBy: { id: 'asc' },
          include: {
            cashState: true,
            balances: true,
            _count: { select: { activities: true, balances: true } }
          }
        });
        const orders = await tx.order.findMany({
          where: { userId },
          orderBy: { id: 'asc' }
        });
        const settings = await tx.settings.findUnique({ where: { userId } });
        const profileState = await tx.symbolProfile.findMany({
          where: {
            OR: [
              { userId },
              { id: { in: orders.map((o) => o.symbolProfileId) } }
            ]
          },
          orderBy: { id: 'asc' }
        });
        const digest = createHash('sha256')
          .update(
            JSON.stringify({
              backup: input.backup,
              choices: input.choices,
              restoreSettings: input.restoreSettings,
              destination,
              orders,
              settings,
              profileState
            })
          )
          .digest('hex');
        if (!preview && digest !== input.digest)
          throw new ConflictException(
            'The destination or import choices changed. Preview the backup again.'
          );
        const backup = input.backup;
        if (!backup.accounts?.length && !backup.activities.length)
          throw new BadRequestException(
            'The backup contains no accounts or activities.'
          );
        if (
          backup.activities.length > 10000 ||
          (backup.accounts?.length ?? 0) > 200
        )
          throw new BadRequestException(
            'This restore supports up to 200 accounts and 10,000 activities.'
          );
        const sources = backup.accounts ?? [];
        const ids = sources.map((a) => a.id);
        if (ids.some((id) => !id) || new Set(ids).size !== ids.length)
          throw new BadRequestException(
            'Every exported account must have a distinct source ID.'
          );
        const choices = input.choices ?? [];
        if (
          new Set(choices.map((c) => c.sourceId)).size !== choices.length ||
          choices.some((c) => !ids.includes(c.sourceId))
        )
          throw new BadRequestException('Invalid account choices.');
        const choice = new Map(choices.map((c) => [c.sourceId, c.targetId]));
        const included = sources.filter((a) => choice.get(a.id) !== 'SKIP');
        const selected = new Set(included.map((a) => a.id));
        const targetIds = included
          .map((a) => choice.get(a.id))
          .filter((id) => id && id !== 'NEW');
        if (new Set(targetIds).size !== targetIds.length)
          throw new BadRequestException(
            'Two source accounts cannot be merged into one destination account.'
          );
        const errors: string[] = [];
        const warnings: string[] = [];
        const accountPlan = included.map((a) => {
          const targetId = choice.get(a.id);
          const target =
            targetId && targetId !== 'NEW'
              ? destination.find((d) => d.id === targetId)
              : undefined;
          if (targetId && targetId !== 'NEW' && !target)
            errors.push(`Destination account not found for ${a.name}.`);
          if (target && target.currency !== a.currency)
            errors.push(`Currency mismatch for ${a.name}.`);
          if (a.cashManagement && target?.cashState)
            errors.push(
              `Account ${a.name} already has cash history. Existing cash ledgers are never replaced; choose a new account.`
            );
          const calculation = a.cashManagement
            ? this.cash.validateRestore(a.cashManagement, a.currency)
            : undefined;
          return {
            sourceId: a.id,
            name: a.name,
            currency: a.currency,
            targetId: target?.id ?? null,
            action: target ? 'EXISTING' : 'NEW',
            cashEvents: a.cashManagement?.events.length ?? 0,
            cashBalance: calculation?.balances.at(-1)?.value.toFixed() ?? null
          };
        });
        const activities = backup.activities.filter(
          (a) => !a.accountId || selected.has(a.accountId)
        );
        for (const a of backup.activities)
          if (a.accountId && !ids.includes(a.accountId))
            errors.push(
              'An activity references an account missing from the backup.'
            );
        for (const account of included)
          for (const event of account.cashManagement?.events ?? []) {
            if (
              event.orderId &&
              !activities.some(
                (a) => a.id === event.orderId && a.accountId === account.id
              )
            )
              errors.push(
                `Account ${account.name}: the linked activity must belong to the same source account.`
              );
          }
        const activityIds = new Set(
          activities.map((a) => a.id).filter(Boolean)
        );
        if (activityIds.size !== activities.filter((a) => a.id).length)
          errors.push('The backup contains duplicate activity IDs.');
        const transfers = new Map<
          string,
          {
            accountId: string;
            selected: boolean;
            currency: string;
            event: NonNullable<
              (typeof sources)[number]['cashManagement']
            >['events'][number];
          }[]
        >();

        for (const account of sources) {
          for (const event of account.cashManagement?.events ?? []) {
            if (
              selected.has(account.id) &&
              event.orderId &&
              !activityIds.has(event.orderId)
            )
              errors.push(
                `Account ${account.name}: a linked activity is missing from the backup. Export it again from the source instance.`
              );

            if (event.transferCounterparty && !event.transferId)
              errors.push(
                'Transfer counterparty metadata requires a transfer ID.'
              );

            if (event.transferId) {
              const halves = transfers.get(event.transferId) ?? [];
              halves.push({
                accountId: account.id,
                selected: selected.has(account.id),
                currency: account.cashManagement.currency,
                event
              });
              transfers.set(event.transferId, halves);
            }
          }
        }

        for (const [transferId, halves] of transfers) {
          if (!halves.some((half) => half.selected)) continue;

          const invalid = () =>
            errors.push(
              `Transfer ${transferId}: inconsistent or incomplete transfer data.`
            );

          if (halves.length === 1) {
            const half = halves[0];
            const counterpart = half.event.transferCounterparty;
            const counterpartAccount = sources.find(
              (account) => account.id === counterpart?.accountId
            );

            if (
              !half.selected ||
              counterpart?.mode !== 'LEGACY' ||
              !counterpart.accountId ||
              counterpart.accountId === half.accountId ||
              !selected.has(counterpart.accountId) ||
              !counterpartAccount ||
              (counterpartAccount.currency != null &&
                counterpartAccount.currency !== counterpart.currency) ||
              typeof counterpart.currency !== 'string' ||
              !/^[A-Z]{3}$/.test(counterpart.currency) ||
              typeof counterpart.amount !== 'string' ||
              half.event.type !== 'MOVEMENT' ||
              typeof half.event.amount !== 'string'
            ) {
              invalid();
              continue;
            }

            try {
              if (
                new Big(counterpart.amount).eq(0) ||
                new Big(half.event.amount).eq(0) ||
                new Big(counterpart.amount).s * new Big(half.event.amount).s !==
                  -1
              )
                invalid();
            } catch {
              invalid();
            }
            continue;
          }

          if (halves.length !== 2 || halves.some((half) => !half.selected)) {
            errors.push(
              `Transfer ${transferId}: both source and destination accounts must be restored.`
            );
            continue;
          }

          const [left, right] = halves;

          if (
            left.accountId === right.accountId ||
            left.event.date !== right.event.date ||
            left.event.type !== 'MOVEMENT' ||
            right.event.type !== 'MOVEMENT' ||
            typeof left.event.amount !== 'string' ||
            typeof right.event.amount !== 'string'
          ) {
            invalid();
            continue;
          }

          const leftCounterpart = left.event.transferCounterparty;
          const rightCounterpart = right.event.transferCounterparty;

          if (Boolean(leftCounterpart) !== Boolean(rightCounterpart)) {
            invalid();
            continue;
          }

          if (leftCounterpart && rightCounterpart) {
            if (
              leftCounterpart.mode !== 'CASH' ||
              rightCounterpart.mode !== 'CASH' ||
              leftCounterpart.accountId !== right.accountId ||
              rightCounterpart.accountId !== left.accountId ||
              leftCounterpart.currency !== right.currency ||
              rightCounterpart.currency !== left.currency
            ) {
              invalid();
              continue;
            }
          }

          try {
            const leftAmount = new Big(left.event.amount);
            const rightAmount = new Big(right.event.amount);
            if (
              leftAmount.eq(0) ||
              rightAmount.eq(0) ||
              leftAmount.s * rightAmount.s !== -1 ||
              (leftCounterpart &&
                rightCounterpart &&
                (typeof leftCounterpart.amount !== 'string' ||
                  typeof rightCounterpart.amount !== 'string' ||
                  !new Big(leftCounterpart.amount).eq(rightAmount) ||
                  !new Big(rightCounterpart.amount).eq(leftAmount)))
            )
              invalid();
          } catch {
            invalid();
          }
        }
        const matches = activities.map((a) => {
          const target = accountPlan.find(
            (p) => p.sourceId === a.accountId
          )?.targetId;
          const same =
            a.accountId && !target
              ? []
              : orders.filter(
                  (o) =>
                    o.accountId === (target ?? null) &&
                    o.date.toISOString() === new Date(a.date).toISOString() &&
                    o.type === a.type &&
                    o.quantity === a.quantity &&
                    o.unitPrice === a.unitPrice &&
                    o.fee === a.fee &&
                    (o.currency ?? '') === (a.currency ?? '') &&
                    (o.comment ?? '') === (a.comment ?? '')
                );
          return { a, candidates: same };
        });
        // Include the instrument in duplicate detection: two different assets may have identical prices.
        const profiles = profileState;
        const duplicateMap = new Map<number, string>();
        const consumedOrders = new Set<string>();
        matches.forEach(({ a, candidates }, i) => {
          const matching = candidates.filter((o) =>
            profiles.some(
              (p) =>
                p.id === o.symbolProfileId &&
                p.dataSource === (a.dataSource ?? 'MANUAL') &&
                (p.symbol === a.symbol ||
                  (p.dataSource === 'MANUAL' &&
                    backup.assetProfiles?.some(
                      (source) =>
                        source.symbol === a.symbol &&
                        source.name &&
                        source.name === p.name &&
                        source.currency === p.currency
                    )))
            )
          );
          if (matching.length > 1)
            errors.push(
              'Multiple destination activities match a source activity. Restore into a new account instead.'
            );
          else if (
            matching.length === 1 &&
            !consumedOrders.has(matching[0].id)
          ) {
            duplicateMap.set(i, matching[0].id);
            consumedOrders.add(matching[0].id);
          }
        });
        for (const source of included) {
          if (!source.cashManagement) continue;
          const targetId = accountPlan.find(
            (p) => p.sourceId === source.id
          )?.targetId;
          const target = destination.find((a) => a.id === targetId);
          if (!target || target.cashState) continue;
          if (
            orders.some(
              (o) => o.accountId === targetId && !consumedOrders.has(o.id)
            )
          ) {
            errors.push(
              `Account ${source.name} contains activities not matched by this backup. Choose a new account.`
            );
          }
          const calculation = this.cash.validateRestore(
            source.cashManagement,
            source.currency
          );
          const opening = new Date(
            source.cashManagement.openingBalance.date
          ).getTime();
          for (const balance of target.balances.filter(
            (b) => b.date.getTime() >= opening
          )) {
            const expected = calculation.balances.find(
              (b) => b.date === balance.date.toISOString().slice(0, 10)
            );
            if (
              !expected ||
              balance.date.toISOString().slice(11) !== '00:00:00.000Z' ||
              expected.value.toNumber() !== balance.value
            ) {
              errors.push(
                `Account ${source.name} has balances that conflict with the cash ledger in this backup.`
              );
            }
          }
        }
        if (!included.length && !activities.length)
          errors.push('Select at least one account or activity to restore.');
        const hasDestinationData =
          orders.length > 0 ||
          destination.some(
            (a) =>
              a.balances.some((b) => b.value !== 0) ||
              (a.cashState &&
                (a.cashState.lastSequence > 0 ||
                  !a.cashState.openingBalance.isZero()))
          );
        if (hasDestinationData)
          warnings.push(
            'Existing data is retained. Only explicitly selected destination accounts are reused; account names are never matched automatically.'
          );
        if (activities.some((a) => !a.accountId))
          warnings.push(
            'Some activities have no account and will remain unassigned.'
          );
        if (input.restoreSettings && hasDestinationData)
          warnings.push(
            'Settings are restored only into an empty portfolio. Existing settings will be retained.'
          );
        const plan = {
          digest,
          accounts: accountPlan,
          destinationAccounts: destination.map((a) => ({
            id: a.id,
            name: a.name,
            currency: a.currency
          })),
          activities: activities.length,
          newActivities: activities.length - duplicateMap.size,
          duplicates: duplicateMap.size,
          cashEvents: accountPlan.reduce((n, a) => n + a.cashEvents, 0),
          errors: [...new Set(errors)],
          warnings
        };
        if (preview) return plan;
        if (errors.length) throw new BadRequestException(plan.errors.join(' '));
        const platforms = new Map<string, string>();
        for (const p of backup.platforms ?? []) {
          const platform = await tx.platform.upsert({
            where: { url: p.url },
            create: { name: p.name, url: p.url },
            update: {}
          });
          if (p.id) platforms.set(p.id, platform.id);
        }
        const tags = new Map<string, string>();
        for (const tag of backup.tags ?? []) {
          const global = tag.id
            ? await tx.tag.findFirst({ where: { id: tag.id, userId: null } })
            : undefined;
          const created =
            global ??
            (await tx.tag.upsert({
              where: { name_userId: { name: tag.name, userId } },
              create: { name: tag.name, userId },
              update: {}
            }));
          if (tag.id) tags.set(tag.id, created.id);
        }
        const accounts = new Map<string, string>();
        for (const a of included) {
          const accountResolution = accountPlan.find(
            (p) => p.sourceId === a.id
          );
          if (accountResolution.targetId) {
            accounts.set(a.id, accountResolution.targetId);
            continue;
          }
          const tagIds = (a.tags ?? [])
            .map((id) => tags.get(id))
            .filter(Boolean);
          if (
            a.isExcluded &&
            (await tx.tag.findFirst({
              where: { id: TAG_ID_EXCLUDE_FROM_ANALYSIS, userId: null }
            }))
          )
            tagIds.push(TAG_ID_EXCLUDE_FROM_ANALYSIS);
          const created = await tx.account.create({
            data: {
              userId,
              name: a.name,
              currency: a.currency,
              comment: a.comment,
              platformId: platforms.get(a.platformId),
              tags: { create: [...new Set(tagIds)].map((tagId) => ({ tagId })) }
            }
          });
          accounts.set(a.id, created.id);
          {
            // Managed balances are rebuilt from the ledger; older snapshots
            // outside its managed interval must still survive a full restore.
            const balances = a.cashManagement
              ? (a.balances ?? []).filter(
                  (b) =>
                    new Date(b.date).getTime() <
                    new Date(a.cashManagement.openingBalance.date).getTime()
                )
              : (a.balances ??
                (a.balance !== undefined
                  ? [{ date: new Date(), value: a.balance }]
                  : []));
            for (const b of balances) {
              if (
                !Number.isFinite(b.value) ||
                Number.isNaN(new Date(b.date).getTime())
              )
                throw new BadRequestException('Invalid account balance.');
              await tx.accountBalance.create({
                data: {
                  accountId: created.id,
                  userId,
                  date: new Date(b.date),
                  value: b.value
                }
              });
            }
          }
        }
        const symbols = new Map<string, string>();
        const manualSymbols = new Set(
          activities
            .filter(
              (a, i) =>
                !duplicateMap.has(i) && (a.dataSource ?? 'MANUAL') === 'MANUAL'
            )
            .map((a) => a.symbol)
        );
        for (const profile of backup.assetProfiles ?? []) {
          if (!manualSymbols.has(profile.symbol)) continue;
          const symbol = randomUUID();
          const { marketData, ...data } = profile;
          const created = await tx.symbolProfile.create({
            data: {
              ...data,
              symbol,
              userId
            } as Prisma.SymbolProfileUncheckedCreateInput
          });
          symbols.set(profile.symbol, created.id);
          for (const quote of marketData ?? []) {
            if (
              !Number.isFinite(quote.marketPrice) ||
              quote.marketPrice < 0 ||
              Number.isNaN(new Date(quote.date).getTime())
            )
              throw new BadRequestException('Invalid custom market price.');
            await tx.marketData.create({
              data: {
                dataSource: 'MANUAL',
                symbol,
                date: new Date(quote.date),
                marketPrice: quote.marketPrice
              }
            });
          }
        }
        const orderIds: Record<string, string> = {};
        for (const [index, a] of activities.entries()) {
          let orderId = duplicateMap.get(index);
          if (!orderId) {
            const dataSource = a.dataSource ?? DataSource.MANUAL;
            let symbolProfileId =
              dataSource === DataSource.MANUAL
                ? symbols.get(a.symbol)
                : undefined;
            if (!symbolProfileId) {
              // Manual symbols are private to the destination user, even on the same server.
              const symbol =
                dataSource === DataSource.MANUAL ? randomUUID() : a.symbol;
              const p = await tx.symbolProfile.upsert({
                where: { dataSource_symbol: { dataSource, symbol } },
                create: {
                  currency: a.currency,
                  dataSource,
                  symbol,
                  name: a.symbol,
                  userId: dataSource === DataSource.MANUAL ? userId : undefined
                },
                update: {}
              });
              symbolProfileId = p.id;
              if (dataSource === DataSource.MANUAL) symbols.set(a.symbol, p.id);
            }
            const created = await tx.order.create({
              data: {
                userId,
                accountId: a.accountId ? accounts.get(a.accountId) : null,
                accountUserId: a.accountId ? userId : null,
                symbolProfileId,
                currency: a.currency,
                comment: a.comment,
                date: new Date(a.date),
                fee: a.fee,
                quantity: a.quantity,
                type: a.type,
                unitPrice: a.unitPrice,
                tags: {
                  connect: (a.tags ?? [])
                    .map((id) => tags.get(id))
                    .filter(Boolean)
                    .map((id) => ({ id }))
                }
              }
            });
            orderId = created.id;
          }
          if (a.id) orderIds[a.id] = orderId;
        }
        const transferIds = new Map<string, string>();
        for (const a of included)
          if (a.cashManagement) {
            const snapshot = structuredClone(a.cashManagement);
            for (const event of snapshot.events) {
              if (!event.importReference && event.id)
                event.importReference = `ledger:${event.id}`;
            }
            for (const event of snapshot.events) {
              if (event.transferId) {
                if (!transferIds.has(event.transferId))
                  transferIds.set(event.transferId, randomUUID());
                event.transferId = transferIds.get(event.transferId);
              }
              if (event.transferCounterparty) {
                const targetAccountId = accounts.get(
                  event.transferCounterparty.accountId
                );
                if (!targetAccountId)
                  throw new BadRequestException(
                    'The transfer counterparty account is missing from the restore.'
                  );
                event.transferCounterparty.accountId = targetAccountId;
              }
            }
            await this.cash.restoreInTransaction(
              { accountId: accounts.get(a.id), userId },
              snapshot,
              orderIds,
              tx,
              { currency: a.currency }
            );
          }
        if (
          input.restoreSettings &&
          !hasDestinationData &&
          backup.user?.settings
        ) {
          const current = (settings?.settings ?? {}) as Record<string, unknown>;
          const imported = backup.user.settings;
          const next = { ...current };
          if (
            typeof imported.currency === 'string' &&
            /^[A-Z]{3}$/.test(imported.currency)
          )
            next.baseCurrency = imported.currency;
          if (
            ['ROAI', 'TWR', 'MWR', 'ROI'].includes(
              imported.performanceCalculationType
            )
          )
            next.performanceCalculationType =
              imported.performanceCalculationType;
          await tx.settings.upsert({
            where: { userId },
            create: { userId, settings: next as Prisma.InputJsonObject },
            update: { settings: next as Prisma.InputJsonObject }
          });
        }
        return { ...plan, restored: true };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 10000,
        timeout: 120000
      }
    );
    if (!preview) {
      // Notifications and quote gathering happen after the financial transaction commits.
      // A queue failure must never make the client retry an already committed import.
      try {
        this.emitter.emit(
          PortfolioChangedEvent.getName(),
          new PortfolioChangedEvent({ userId })
        );
      } catch {}
      try {
        const selected = new Set(result.accounts.map((a) => a.sourceId));
        await this.gathering.gatherSymbols({
          priority: DATA_GATHERING_QUEUE_PRIORITY_HIGH,
          dataGatheringItems: input.backup.activities
            .filter(
              (a) =>
                (!a.accountId || selected.has(a.accountId)) &&
                a.dataSource &&
                a.dataSource !== 'MANUAL'
            )
            .map((a) => ({
              dataSource: a.dataSource,
              symbol: a.symbol,
              date: new Date(a.date)
            }))
        });
      } catch {}
    }
    return result;
  }
}
