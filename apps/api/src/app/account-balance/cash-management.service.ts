import { PortfolioChangedEvent } from '@ghostfolio/api/events/portfolio-changed.event';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import {
  CashConfirmation,
  CashCsvPreview,
  CashEventInput,
  CashManagementSnapshot
} from '@ghostfolio/common/interfaces';

import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Account, CashEvent, Order, Prisma } from '@prisma/client';
import { Big } from 'big.js';
import { format } from 'date-fns';
import { omit } from 'lodash-es';
import { createHash, randomUUID } from 'node:crypto';

import {
  CashBalanceCalculation,
  CashBalanceEvent,
  CashOpeningBalance,
  calculateCashBalances
} from './cash-balance-calculator';
import { findNewCashDeficit } from './cash-balance-warning';
import {
  CashCsvRow,
  csvDate,
  decimal,
  readCashCsv,
  writeCashCsv
} from './cash-ledger-csv';

export type {
  CashEventInput,
  CashManagementSnapshot
} from '@ghostfolio/common/interfaces';

interface CashAccountScope {
  accountId: string;
  userId: string;
}

type CashState = Prisma.AccountCashStateGetPayload<{
  include: { events: true };
}>;

type EventValue = Pick<CashEvent, 'date' | 'sequence' | 'type'> & {
  value: Prisma.Decimal | string;
};

const MAX_DATABASE_INTEGER = 2147483647;
const IMPLICIT_OPENING_DATE = '0001-01-01';

/**
 * Canonical cash ledger and the compatibility projection consumed by portfolio calculators.
 * All writers lock the owner's Account row before touching cash. Activity effects,
 * transfers and projections commit together; manual mutations also require a revision.
 * Negative balances require a server-calculated confirmation. Earlier unmanaged
 * history is never reconstructed from old investment activities.
 */
@Injectable()
export class CashManagementService {
  private readonly logger = new Logger(CashManagementService.name);

  public constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly prismaService: PrismaService,
    private readonly exchangeRateDataService?: ExchangeRateDataService
  ) {}

  public async exportCsv(scope: CashAccountScope) {
    return this.inAccountTransaction(scope, async (transaction, account) => {
      const state =
        (await this.readState(transaction, scope)) ??
        (await this.draftState(transaction, scope, account.currency));
      this.checkCurrency(account, state);
      const owner = await transaction.account.findFirst({
        where: { id: scope.accountId, userId: scope.userId },
        select: { name: true }
      });
      const orders = await transaction.order.findMany({
        where: scope,
        include: { SymbolProfile: true }
      });
      const byId = new Map(orders.map((order) => [order.id, order]));
      const base = {
        Version: '1',
        Currency: state.currency,
        SourceAccount: scope.accountId,
        SourceAccountName: owner?.name ?? ''
      };
      const rows: Partial<CashCsvRow>[] = [
        {
          ...base,
          Record: 'META',
          Date: this.toOpeningBalance(state).date,
          Sequence: '0',
          Amount: new Big(state.openingBalance.toString()).toFixed(),
          AutomaticOpening: String(state.isAutomaticOpening ?? false)
        }
      ];
      for (const event of state.events) {
        const order = event.orderId ? byId.get(event.orderId) : undefined;
        rows.push({
          ...base,
          Record: 'EVENT',
          Reference: event.importReference ?? `ledger:${event.id}`,
          Date: event.date.toISOString().slice(0, 10),
          Sequence: String(event.sequence),
          Operation: event.orderId
            ? 'ACTIVITY'
            : event.transferId
              ? 'TRANSFER'
              : event.type === 'CHECKPOINT'
                ? 'RECONCILIATION'
                : new Big(event.value.toString()).lt(0)
                  ? 'WITHDRAWAL'
                  : 'DEPOSIT',
          Amount:
            event.orderId || event.transferId || event.type === 'CHECKPOINT'
              ? new Big(event.value.toString()).toFixed()
              : new Big(event.value.toString()).abs().toFixed(),
          Fee: new Big(event.fee.toString()).toFixed(),
          Note: event.comment ?? '',
          TransferReference: event.transferId ?? '',
          ...(order
            ? {
                ActivityId: order.id,
                ActivityName: order.SymbolProfile.name ?? '',
                ActivityType: order.type,
                ActivityDate: format(order.date, 'yyyy-MM-dd'),
                DataSource: order.SymbolProfile.dataSource,
                Symbol: order.SymbolProfile.symbol,
                ActivityCurrency:
                  order.currency ?? order.SymbolProfile.currency,
                Quantity: new Big(order.quantity).toFixed(),
                UnitPrice: new Big(order.unitPrice).toFixed(),
                ActivityFee: new Big(order.fee).toFixed()
              }
            : {})
        });
      }
      const csv = writeCashCsv(rows);
      if (rows.length > 5000 || Buffer.byteLength(csv, 'utf8') > 2_000_000)
        throw new BadRequestException(
          'This cash history exceeds the supported CSV size. Use the full JSON backup.'
        );
      return { csv };
    });
  }

  public async previewCsv(
    scope: CashAccountScope,
    csv: string,
    activityLinks: Record<string, string> = {}
  ): Promise<CashCsvPreview> {
    return this.inAccountTransaction(scope, async (transaction, account) => {
      const state =
        (await this.readState(transaction, scope)) ??
        (await this.draftState(transaction, scope, account.currency));
      this.checkCurrency(account, state);
      return (await this.prepareCsv(transaction, state, csv, activityLinks))
        .preview;
    });
  }

  public async importCsv(
    scope: CashAccountScope,
    data: {
      csv: string;
      activityLinks?: Record<string, string>;
      expectedRevision: number;
      digest: string;
      confirmNegativeBalance?: boolean;
    }
  ) {
    const result = await this.inAccountTransaction(
      scope,
      (transaction, account) =>
        this.importCsvInTransaction(scope, data, transaction, account)
    );
    this.publishChange(scope.userId);
    return result;
  }

  private async importCsvInTransaction(
    scope: CashAccountScope,
    data: {
      csv: string;
      activityLinks?: Record<string, string>;
      expectedRevision: number;
      digest: string;
      confirmNegativeBalance?: boolean;
    },
    transaction: Prisma.TransactionClient,
    account: Pick<Account, 'currency'>
  ) {
    let state =
      (await this.readState(transaction, scope)) ??
      (await this.draftState(transaction, scope, account.currency));
    this.checkCurrency(account, state);
    const plan = await this.prepareCsv(
      transaction,
      state,
      data.csv,
      data.activityLinks
    );
    if (
      state.revision !== data.expectedRevision ||
      plan.preview.digest !== data.digest
    )
      throw new ConflictException(
        'The cash history or linked activities changed. Preview the file again.'
      );
    if (plan.preview.errors.length)
      throw new BadRequestException(plan.preview.errors.join('\n'));
    if (!plan.additions.length && !plan.openingChanged)
      return this.toSnapshot(state, this.calculateState(state));
    if (plan.deficitDate && !data.confirmNegativeBalance)
      this.requireNegativeConfirmation(
        scope.accountId,
        state.revision,
        plan.deficitDate
      );
    state = await this.requireState({
      transaction,
      scope,
      account,
      expectedRevision: data.expectedRevision
    });
    await this.checkProjectionOwnership({
      transaction,
      scope,
      openingDate: state.openingDate
    });
    const nextState: CashState = {
      ...state,
      ...plan.opening,
      revision: state.revision + 1,
      lastSequence: Math.max(
        state.lastSequence,
        ...plan.additions.map((event) => event.sequence)
      ),
      events: [...state.events, ...plan.additions]
    };
    if (nextState.revision > MAX_DATABASE_INTEGER)
      throw new ConflictException('Cash revision limit reached');
    if (plan.additions.length)
      await transaction.cashEvent.createMany({
        data: plan.additions.map((event) => ({ ...event }))
      });
    await transaction.accountCashState.update({
      where: { accountId_userId: scope },
      data: {
        revision: nextState.revision,
        lastSequence: nextState.lastSequence,
        openingDate: nextState.openingDate,
        openingBalance: nextState.openingBalance,
        isAutomaticOpening: nextState.isAutomaticOpening
      }
    });
    await this.writeProjection(transaction, nextState, plan.calculation);
    return this.toSnapshot(nextState, plan.calculation);
  }

  public inspectAccountCsv(csv: string) {
    const rows = readCashCsv(csv);
    const currencies = new Set(rows.map((row) => row.Currency).filter(Boolean));
    const sources = new Set(
      rows.map((row) => row.SourceAccount).filter(Boolean)
    );
    const names = new Set(
      rows.map((row) => row.SourceAccountName).filter(Boolean)
    );
    if (currencies.size !== 1 || sources.size > 1 || names.size > 1) {
      throw new BadRequestException(
        'The CSV must describe one account and one currency.'
      );
    }
    return { name: [...names][0] ?? '', currency: [...currencies][0] };
  }

  /** Preview never creates an account; confirmation saves account and journal together. */
  public async newAccountFromCsv(
    userId: string,
    data: {
      accountId: string;
      name: string;
      currency: string;
      csv: string;
      digest?: string;
      confirmNegativeBalance?: boolean;
    },
    previewOnly: boolean
  ) {
    if (!data.name.trim())
      throw new BadRequestException('An account name is required.');
    const result = await this.prismaService.$transaction(
      async (transaction) => {
        await transaction.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
        if (
          await transaction.account.findFirst({ where: { id: data.accountId } })
        ) {
          throw new ConflictException(
            'This account was already created. Select it as an existing destination and preview again.'
          );
        }
        const source = this.inspectAccountCsv(data.csv);
        if (source.currency !== data.currency)
          throw new BadRequestException('Currency must match the CSV.');
        const scope = { accountId: data.accountId, userId };
        const state = await this.draftState(transaction, scope, data.currency);
        const plan = await this.prepareCsv(transaction, state, data.csv, {});
        const digest = createHash('sha256')
          .update(
            JSON.stringify({
              userId,
              accountId: data.accountId,
              name: data.name,
              currency: data.currency,
              csvDigest: plan.preview.digest
            })
          )
          .digest('hex');
        if (
          !plan.preview.newCount &&
          !plan.openingChanged &&
          !plan.preview.errors.length
        ) {
          plan.preview.errors.push(
            'The CSV has no movements or opening balance to import.'
          );
        }
        if (previewOnly) return { ...plan.preview, digest };
        if (digest !== data.digest)
          throw new ConflictException(
            'The account details changed. Preview the CSV again.'
          );
        if (plan.preview.errors.length)
          throw new BadRequestException(plan.preview.errors.join('\n'));
        if (!plan.preview.newCount && !plan.openingChanged)
          throw new BadRequestException(
            'The CSV has no movements or opening balance to import.'
          );
        await transaction.account.create({
          data: {
            id: data.accountId,
            userId,
            name: data.name.trim(),
            currency: data.currency
          }
        });
        return this.importCsvInTransaction(
          scope,
          { ...data, expectedRevision: 0, digest: plan.preview.digest },
          transaction,
          { currency: data.currency }
        );
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5000,
        timeout: 15000
      }
    );
    if (!previewOnly) this.publishChange(userId);
    return result;
  }

  private async prepareCsv(
    transaction: Prisma.TransactionClient,
    state: CashState,
    csv: string,
    activityLinks: Record<string, string> = {}
  ) {
    activityLinks ??= {};
    const rows = readCashCsv(csv);
    if (
      Object.entries(activityLinks).some(
        ([line, id]) =>
          !/^\d+$/.test(line) ||
          Number(line) < 2 ||
          Number(line) > rows.length + 1 ||
          typeof id !== 'string' ||
          !id.length ||
          id.length > 128 ||
          rows[Number(line) - 2]?.Operation !== 'ACTIVITY'
      )
    )
      throw new BadRequestException('Invalid activity association.');
    const preview: CashCsvPreview = {
      accountId: state.accountId,
      currency: state.currency,
      revision: state.revision,
      digest: '',
      rows: [],
      errors: [],
      warnings: [],
      newCount: 0,
      existingCount: 0,
      finalBalance: '',
      minimumBalance: ''
    };
    const orders = await transaction.order.findMany({
      where: { accountId: state.accountId, userId: state.userId },
      include: { SymbolProfile: true }
    });
    const additions: CashEvent[] = [];
    let opening = {
      openingDate: state.openingDate,
      openingBalance: state.openingBalance,
      isAutomaticOpening: state.isAutomaticOpening
    };
    let openingChanged = false;
    const metadata = rows.filter((row) => row.Record === 'META');
    try {
      if (metadata.length > 1)
        throw new BadRequestException('Only one META row is allowed.');
      if (rows.some((row) => row.Currency !== state.currency))
        throw new BadRequestException(
          'The file currency must match the destination account. No automatic conversion is performed.'
        );
      if (metadata.length) {
        const meta = metadata[0];
        const value = decimal(meta.Amount);
        const date = csvDate(meta.Date, true);
        if (!['true', 'false'].includes(meta.AutomaticOpening))
          throw new BadRequestException(
            'META requires AutomaticOpening true or false.'
          );
        if (
          meta.AutomaticOpening === 'true' &&
          (date !== IMPLICIT_OPENING_DATE || value !== '0')
        )
          throw new BadRequestException(
            'An automatic opening must be zero at the internal opening date.'
          );
        openingChanged =
          date !== this.toOpeningBalance(state).date ||
          !new Big(value).eq(state.openingBalance.toString()) ||
          (meta.AutomaticOpening === 'true') !== state.isAutomaticOpening;
        if (
          openingChanged &&
          (state.events.length ||
            !state.isAutomaticOpening ||
            !state.openingBalance.isZero())
        )
          throw new BadRequestException(
            'The file opening conflicts with the existing account. Existing history is never replaced.'
          );
        opening = {
          openingDate: this.toUtcDate(date),
          openingBalance: new Prisma.Decimal(value),
          isAutomaticOpening: meta.AutomaticOpening === 'true'
        };
      }
      if (
        rows.some(
          (row) => row.SourceAccount && row.SourceAccount !== state.accountId
        )
      )
        preview.warnings.push(
          'The CSV refers to a different source account. Movements will be imported into the selected destination account.'
        );
    } catch (error) {
      preview.errors.push((error as Error).message);
    }
    const references = new Set<string>();
    const positions = new Set(
      state.events.map(
        (event) => `${event.date.toISOString().slice(0, 10)}/${event.sequence}`
      )
    );
    let lastSequence = state.lastSequence;
    for (const [index, row] of rows.entries()) {
      if (row.Record === 'META') continue;
      const item: CashCsvPreview['rows'][number] = {
        line: index + 2,
        date: row.Date,
        operation: row.Operation,
        amount: row.Amount,
        status: 'NEW',
        message: ''
      };
      preview.rows.push(item);
      try {
        const date = csvDate(row.Date);
        if (date > format(new Date(), 'yyyy-MM-dd'))
          throw new BadRequestException('Future cash dates are not supported.');
        if (
          row.Note.length > 1000 ||
          row.Reference.length > 200 ||
          row.ActivityId.length > 128
        )
          throw new BadRequestException(
            'Note or reference exceeds the supported length.'
          );
        if (row.Reference && references.has(row.Reference))
          throw new BadRequestException(
            'Duplicate Reference inside this file.'
          );
        if (row.Reference) references.add(row.Reference);
        const amount = decimal(row.Amount);
        const fee = decimal(row.Fee || '0');
        if (new Big(fee).lt(0))
          throw new BadRequestException('Fee must not be negative.');
        const linked = row.Operation === 'ACTIVITY';
        const transfer = row.Operation === 'TRANSFER';
        const checkpoint = row.Operation === 'RECONCILIATION';
        if (
          ![
            'DEPOSIT',
            'WITHDRAWAL',
            'RECONCILIATION',
            'ACTIVITY',
            'TRANSFER'
          ].includes(row.Operation)
        )
          throw new BadRequestException(
            'Unsupported operation. Use DEPOSIT, WITHDRAWAL, RECONCILIATION, ACTIVITY or TRANSFER.'
          );
        // Existing journals can contain zero-value movements, including fee-only
        // debits. Preserve those in versioned exports without changing manual CSV rules.
        const exportedZero =
          amount === '0' &&
          row.Version === '1' &&
          row.Record === 'EVENT' &&
          !!row.Reference;
        if (
          (row.Operation === 'DEPOSIT' || row.Operation === 'WITHDRAWAL') &&
          !new Big(amount).gt(0) &&
          !exportedZero
        )
          throw new BadRequestException(
            'Deposits and withdrawals require a positive Amount.'
          );
        if ((checkpoint || linked || transfer) && fee !== '0')
          throw new BadRequestException(
            'Reconciliations and linked operations require Fee 0; linked Amount already includes activity costs.'
          );
        if (!linked && row.ActivityId)
          throw new BadRequestException(
            'ActivityId is only valid for ACTIVITY rows.'
          );
        if (!transfer && row.TransferReference)
          throw new BadRequestException(
            'TransferReference is only valid for TRANSFER rows.'
          );
        const value =
          row.Operation === 'WITHDRAWAL'
            ? new Big(amount).neg().toFixed()
            : amount;
        let orderId: string | null = null;
        if (linked) {
          const matches = orders.filter((order) => {
            try {
              return (
                order.type === row.ActivityType &&
                format(order.date, 'yyyy-MM-dd') === row.ActivityDate &&
                order.SymbolProfile.dataSource === row.DataSource &&
                (order.SymbolProfile.symbol === row.Symbol ||
                  (row.DataSource === 'MANUAL' &&
                    row.ActivityName &&
                    order.SymbolProfile.name === row.ActivityName)) &&
                (order.currency ?? order.SymbolProfile.currency) ===
                  row.ActivityCurrency &&
                new Big(order.quantity).eq(decimal(row.Quantity)) &&
                new Big(order.unitPrice).eq(decimal(row.UnitPrice)) &&
                new Big(order.fee).eq(decimal(row.ActivityFee))
              );
            } catch {
              return false;
            }
          });
          const selectedId = activityLinks[String(index + 2)];
          const exact = matches.find(
            (order) => order.id === (selectedId ?? row.ActivityId)
          );
          if (selectedId && !exact)
            throw new BadRequestException(
              'The selected activity no longer matches this cash movement.'
            );
          if (!exact && matches.length > 1)
            item.candidates = matches.map((order) => ({
              id: order.id,
              label: `${format(order.date, 'yyyy-MM-dd')} · ${order.type} · ${order.SymbolProfile.name ?? order.SymbolProfile.symbol} · ${order.quantity} × ${order.unitPrice} · ${order.comment ?? ''}`
            }));
          const order =
            exact ?? (matches.length === 1 ? matches[0] : undefined);
          if (!order)
            throw new BadRequestException(
              matches.length
                ? 'Ambiguous activity. Select the matching activity in the preview.'
                : 'Linked activity not found. Import the financial activities first.'
            );
          orderId = order.id;
          if (date !== format(order.date, 'yyyy-MM-dd'))
            throw new BadRequestException(
              'Cash date must match the linked activity date.'
            );
          const expected = await this.orderAmount(order, state.currency);
          if (new Big(value).minus(expected).abs().gt('0.00000001'))
            throw new BadRequestException(
              'Amount differs from the linked activity cash effect.'
            );
        }
        const existing = row.Reference
          ? state.events.find(
              (event) =>
                (event.importReference ?? `ledger:${event.id}`) ===
                  row.Reference || `ledger:${event.id}` === row.Reference
            )
          : undefined;
        const linkedExisting = orderId
          ? [...state.events, ...additions].find(
              (event) => event.orderId === orderId
            )
          : undefined;
        const previous = existing ?? linkedExisting;
        const same = (event: CashEvent) =>
          event.date.toISOString().slice(0, 10) === date &&
          event.type === (checkpoint ? 'CHECKPOINT' : 'MOVEMENT') &&
          new Big(event.value.toString()).eq(value) &&
          new Big(event.fee.toString()).eq(fee) &&
          event.orderId === orderId &&
          (event.comment ?? '') === row.Note &&
          (event.transferId ?? '') === row.TransferReference;
        if (previous) {
          if (
            !same(previous) ||
            (existing &&
              row.Sequence &&
              Number(row.Sequence) !== existing.sequence)
          )
            throw new BadRequestException(
              'The reference or linked activity already exists with different content. No overwrite is performed.'
            );
          item.status = 'EXISTING';
          item.message = 'Already present; no duplicate movement.';
          preview.existingCount++;
          continue;
        }
        if (transfer)
          throw new BadRequestException(
            'A transfer cannot be restored from one account alone. Both account entries must be resolved together.'
          );
        if (!row.Reference && [...state.events, ...additions].some(same))
          throw new BadRequestException(
            'Possible duplicate without Reference. Supply a unique reference to confirm a distinct movement.'
          );
        if (
          !row.Sequence &&
          [...state.events, ...additions].some(
            (event) =>
              event.date.toISOString().slice(0, 10) === date &&
              (checkpoint || event.type === 'CHECKPOINT')
          )
        )
          throw new BadRequestException(
            'Specify Sequence to place this row relative to the same-day reconciliation.'
          );
        if (row.Sequence && !/^\d+$/.test(row.Sequence))
          throw new BadRequestException(
            'Sequence must be a non-negative integer.'
          );
        const sequence = row.Sequence ? Number(row.Sequence) : lastSequence + 1;
        if (
          !Number.isSafeInteger(sequence) ||
          sequence < 0 ||
          (sequence === 0 && !(checkpoint && opening.isAutomaticOpening)) ||
          sequence > MAX_DATABASE_INTEGER ||
          positions.has(`${date}/${sequence}`)
        )
          throw new BadRequestException(
            'Sequence is invalid or already used on this date.'
          );
        positions.add(`${date}/${sequence}`);
        lastSequence = Math.max(lastSequence, sequence);
        additions.push({
          accountId: state.accountId,
          userId: state.userId,
          id: randomUUID(),
          importReference: row.Reference || null,
          date: this.toUtcDate(date),
          sequence,
          type: checkpoint ? 'CHECKPOINT' : 'MOVEMENT',
          value: new Prisma.Decimal(value),
          fee: new Prisma.Decimal(fee),
          comment: row.Note || null,
          orderId,
          transferId: null,
          transferCounterpartyAccountId: null,
          transferCounterpartyMode: null,
          transferCounterpartyAmount: null,
          transferCounterpartyCurrency: null,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        preview.newCount++;
      } catch (error) {
        item.status = 'ERROR';
        item.message = (error as Error).message;
        preview.errors.push(`Row ${item.line}: ${item.message}`);
      }
    }
    let calculation = this.calculateState(state);
    try {
      calculation = this.calculateState({
        ...state,
        ...opening,
        events: [...state.events, ...additions]
      });
    } catch (error) {
      preview.errors.push((error as Error).message);
    }
    preview.finalBalance =
      calculation.balances[calculation.balances.length - 1].value.toFixed();
    preview.minimumBalance = calculation.minimumBalance.value.toFixed();
    preview.firstAffectedDate = additions
      .map((event) => event.date.toISOString().slice(0, 10))
      .sort()[0];
    preview.digest = createHash('sha256')
      .update(
        JSON.stringify({
          csv,
          activityLinks: Object.entries(activityLinks).sort(),
          currency: state.currency,
          revision: state.revision,
          orders: orders
            .map((order) => [
              order.id,
              order.updatedAt.toISOString(),
              order.date.toISOString(),
              order.type,
              order.quantity,
              order.unitPrice,
              order.fee,
              order.currency,
              order.SymbolProfile.symbol,
              order.SymbolProfile.dataSource,
              order.SymbolProfile.name,
              order.SymbolProfile.currency
            ])
            .sort()
        })
      )
      .digest('hex');
    const deficit = openingChanged
      ? calculation.minimumBalance.value.lt(0)
        ? calculation.minimumBalance
        : null
      : preview.errors.length
        ? null
        : findNewCashDeficit({
            openingBalance: this.toOpeningBalance(state),
            previousEvents: state.events.map((event) =>
              this.toCalculatorEvent(event)
            ),
            events: [...state.events, ...additions].map((event) =>
              this.toCalculatorEvent(event)
            )
          });
    return {
      preview,
      additions,
      opening,
      openingChanged,
      calculation,
      deficitDate: deficit?.date
    };
  }

  public async open({
    accountId,
    userId,
    date,
    balance,
    confirmNegativeBalance = false
  }: CashAccountScope & {
    confirmNegativeBalance?: boolean;
    balance: string;
    date: string;
  }): Promise<CashManagementSnapshot> {
    const scope = { accountId, userId };
    const openingDate = this.toUtcDate(date);
    const openingBalance = this.normalizeValue(balance);
    const calculation = this.calculate({
      openingBalance: { balance: openingBalance, date, sequence: 0 },
      events: []
    });
    if (new Big(openingBalance).lt(0) && !confirmNegativeBalance) {
      this.requireNegativeConfirmation(
        scope.accountId,
        null,
        calculation.minimumBalance.date
      );
    }
    const result = await this.inAccountTransaction(
      scope,
      async (transaction, account) => {
        if (!account.currency?.trim()) {
          throw new BadRequestException('The account must have a currency');
        }

        if (await this.readState(transaction, scope)) {
          throw new ConflictException('Cash management is already open');
        }

        // Only a balance at the exact opening date can be adopted. Later legacy
        // snapshots require an explicit historical reconciliation workflow.
        await this.checkProjectionOwnership({
          transaction,
          scope,
          openingDate,
          isOpening: true
        });

        const state = await transaction.accountCashState.create({
          data: {
            ...scope,
            currency: account.currency,
            lastSequence: 0,
            openingBalance,
            openingDate,
            revision: 0
          },
          include: { events: true }
        });

        await this.writeProjection(transaction, state, calculation);

        return this.toSnapshot(state, calculation);
      }
    );

    this.publishChange(userId);

    return result;
  }

  /** Backups must preserve whether cash management was actually activated. */
  public async getPersisted(
    scope: CashAccountScope
  ): Promise<CashManagementSnapshot | null> {
    return this.inAccountTransaction(scope, async (transaction, account) => {
      const state = await this.readState(transaction, scope);
      if (!state) return null;
      this.checkCurrency(account, state);
      return this.toSnapshot(state, this.calculateState(state));
    });
  }

  public async get(
    scope: CashAccountScope
  ): Promise<CashManagementSnapshot | null> {
    return this.inAccountTransaction(scope, async (transaction, account) => {
      const state =
        (await this.readState(transaction, scope)) ??
        (await this.draftState(transaction, scope, account.currency));

      this.checkCurrency(account, state);

      return this.toSnapshot(state, this.calculateState(state));
    });
  }

  public async createEvent({
    accountId,
    userId,
    expectedRevision,
    event,
    confirmNegativeBalance = false
  }: CashAccountScope & {
    confirmNegativeBalance?: boolean;
    event: CashEventInput;
    expectedRevision: number;
  }): Promise<CashManagementSnapshot> {
    const scope = { accountId, userId };
    const normalizedEvent = this.normalizeEvent(event);
    const result = await this.inAccountTransaction(
      scope,
      async (transaction, account) => {
        const state = await this.requireState({
          transaction,
          scope,
          account,
          expectedRevision
        });
        const sequence = this.nextSequence(state);
        const calculation = this.calculate({
          openingBalance: this.toOpeningBalance(state),
          events: [
            ...state.events.map((item) => this.toCalculatorEvent(item)),
            this.toCalculatorEvent({ ...normalizedEvent, sequence })
          ]
        });

        this.checkNewDeficit(
          state,
          [
            ...state.events.map((item) => this.toCalculatorEvent(item)),
            this.toCalculatorEvent({ ...normalizedEvent, sequence })
          ],
          confirmNegativeBalance
        );
        await this.checkProjectionOwnership({
          transaction,
          scope,
          openingDate: state.openingDate
        });

        const createdEvent = await transaction.cashEvent.create({
          data: { ...scope, ...normalizedEvent, sequence }
        });
        const nextState: CashState = {
          ...state,
          events: [...state.events, createdEvent],
          lastSequence: sequence,
          revision: state.revision + 1
        };

        await this.writeState(transaction, nextState);
        await this.writeProjection(transaction, nextState, calculation);

        return this.toSnapshot(nextState, calculation);
      }
    );

    this.publishChange(userId);

    return result;
  }

  public async updateEvent({
    accountId,
    userId,
    expectedRevision,
    eventId,
    event,
    confirmNegativeBalance = false
  }: CashAccountScope & {
    confirmNegativeBalance?: boolean;
    event: CashEventInput;
    eventId: string;
    expectedRevision: number;
  }): Promise<CashManagementSnapshot> {
    const scope = { accountId, userId };
    const normalizedEvent = this.normalizeEvent(event);
    const result = await this.inAccountTransaction(
      scope,
      async (transaction, account) => {
        const state = await this.requireState({
          transaction,
          scope,
          account,
          expectedRevision
        });
        const previousEvent = this.requireEvent(state, eventId);

        const dateChanged =
          previousEvent.date.getTime() !== normalizedEvent.date.getTime();
        const sequence = dateChanged
          ? this.nextSequence(state)
          : previousEvent.sequence;
        const calculation = this.calculate({
          openingBalance: this.toOpeningBalance(state),
          events: state.events.map((item) => {
            return this.toCalculatorEvent(
              item.id === eventId ? { ...normalizedEvent, sequence } : item
            );
          })
        });

        this.checkNewDeficit(
          state,
          state.events.map((item) =>
            this.toCalculatorEvent(
              item.id === eventId ? { ...normalizedEvent, sequence } : item
            )
          ),
          confirmNegativeBalance
        );
        await this.checkProjectionOwnership({
          transaction,
          scope,
          openingDate: state.openingDate
        });

        const updatedEvent = await transaction.cashEvent.update({
          data: { ...normalizedEvent, sequence },
          where: { ...scope, id: eventId }
        });
        const nextState: CashState = {
          ...state,
          events: state.events.map((item) => {
            return item.id === eventId ? updatedEvent : item;
          }),
          lastSequence: dateChanged ? sequence : state.lastSequence,
          revision: state.revision + 1
        };

        await this.writeState(transaction, nextState);
        await this.writeProjection(transaction, nextState, calculation);

        return this.toSnapshot(nextState, calculation);
      }
    );

    this.publishChange(userId);

    return result;
  }

  public async deleteEvent({
    accountId,
    userId,
    expectedRevision,
    eventId,
    confirmNegativeBalance = false
  }: CashAccountScope & {
    confirmNegativeBalance?: boolean;
    eventId: string;
    expectedRevision: number;
  }): Promise<CashManagementSnapshot> {
    const scope = { accountId, userId };
    const result = await this.inAccountTransaction(
      scope,
      async (transaction, account) => {
        const state = await this.requireState({
          transaction,
          scope,
          account,
          expectedRevision
        });

        this.requireEvent(state, eventId);

        const nextState: CashState = {
          ...state,
          events: state.events.filter(({ id }) => id !== eventId),
          revision: state.revision + 1
        };
        const calculation = this.calculateState(nextState);

        this.checkNewDeficit(
          state,
          nextState.events.map((item) => this.toCalculatorEvent(item)),
          confirmNegativeBalance
        );
        await this.checkProjectionOwnership({
          transaction,
          scope,
          openingDate: state.openingDate
        });
        await transaction.cashEvent.delete({
          where: { ...scope, id: eventId }
        });
        await this.writeState(transaction, nextState);
        await this.writeProjection(transaction, nextState, calculation);

        return this.toSnapshot(nextState, calculation);
      }
    );

    this.publishChange(userId);

    return result;
  }

  /** Locks all participating accounts in a stable order before any financial write. */
  public async runInAccounts<T>(
    { accountIds, userId }: { accountIds: string[]; userId: string },
    operation: (
      transaction: Prisma.TransactionClient,
      accounts: Pick<Account, 'id' | 'currency'>[]
    ) => Promise<T>
  ): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.prismaService.$transaction(
          async (transaction) => {
            const accounts: Pick<Account, 'id' | 'currency'>[] = [];
            for (const accountId of [
              ...new Set(accountIds.filter(Boolean))
            ].sort()) {
              const [account] = await transaction.$queryRaw<
                Pick<Account, 'id' | 'currency'>[]
              >`
              SELECT "id", "currency" FROM "Account"
              WHERE "id" = ${accountId} AND "userId" = ${userId} FOR UPDATE
            `;
              if (!account) {
                throw new NotFoundException('Account not found');
              }
              accounts.push(account);
            }
            return operation(transaction, accounts);
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
            maxWait: 5000,
            timeout: 15000
          }
        );
      } catch (error) {
        if (
          !(error instanceof Prisma.PrismaClientKnownRequestError) ||
          error.code !== 'P2034' ||
          attempt >= 2
        ) {
          throw error;
        }
      }
    }
  }

  public validateRestore(
    snapshot: import('@ghostfolio/common/interfaces').CashManagementExport,
    currency: string
  ) {
    if (
      snapshot?.version !== 1 ||
      snapshot.currency !== currency ||
      typeof snapshot.defaultUpdateCash !== 'boolean' ||
      (snapshot.includeCashInPortfolio !== undefined &&
        typeof snapshot.includeCashInPortfolio !== 'boolean') ||
      (snapshot.isAutomaticOpening !== undefined &&
        typeof snapshot.isAutomaticOpening !== 'boolean') ||
      snapshot.openingBalance?.sequence !== 0 ||
      !Array.isArray(snapshot.events)
    ) {
      throw new BadRequestException('Invalid cash ledger export');
    }
    const openingBalance = {
      ...snapshot.openingBalance,
      balance: this.normalizeValue(snapshot.openingBalance.balance)
    };
    this.toUtcDate(openingBalance.date);
    const orderIds = new Set<string>();
    const events = snapshot.events.map((event) => {
      if (
        !event ||
        (event.transferId && typeof event.transferId !== 'string')
      ) {
        throw new BadRequestException('Invalid cash ledger event');
      }
      if (
        event.importReference !== undefined &&
        (typeof event.importReference !== 'string' ||
          !event.importReference.length ||
          event.importReference.length > 200)
      )
        throw new BadRequestException('Invalid cash import reference');
      const normalized = this.normalizeEvent(event);
      if (
        !Number.isInteger(event.sequence) ||
        event.sequence < (snapshot.isAutomaticOpening ? 0 : 1) ||
        event.sequence > MAX_DATABASE_INTEGER ||
        (event.orderId &&
          (typeof event.orderId !== 'string' || orderIds.has(event.orderId)))
      ) {
        throw new BadRequestException(
          'Invalid cash ledger position or activity link'
        );
      }
      if (event.orderId) {
        orderIds.add(event.orderId);
      }
      return { ...normalized, sequence: event.sequence };
    });
    return this.calculate({
      openingBalance,
      events: events.map((event) => this.toCalculatorEvent(event))
    });
  }

  /** Restore replaces no active ledger. Reimporting a backup cannot append its cash twice. */
  public async restore(
    scope: CashAccountScope,
    snapshot: import('@ghostfolio/common/interfaces').CashManagementExport,
    orderIds: Record<string, string>
  ) {
    await this.inAccountTransaction(scope, (transaction, account) =>
      this.restoreInTransaction(scope, snapshot, orderIds, transaction, account)
    );
    this.publishChange(scope.userId);
  }

  /** Shares the caller's transaction so a portfolio restore cannot leave half a ledger. */
  public async restoreInTransaction(
    scope: CashAccountScope,
    snapshot: import('@ghostfolio/common/interfaces').CashManagementExport,
    orderIds: Record<string, string>,
    transaction: Prisma.TransactionClient,
    account: Pick<Account, 'currency'>
  ) {
    this.validateRestore(snapshot, account.currency);
    if (await this.readState(transaction, scope)) {
      return;
    }
    const calculation = this.validateRestore(snapshot, account.currency);
    const openingDate = this.toUtcDate(snapshot.openingBalance.date);
    const balances = await transaction.accountBalance.findMany({
      where: { ...scope, date: { gte: openingDate } }
    });
    // Only identical imported snapshots may be adopted; unrelated broker history is protected.
    for (const balance of balances) {
      const expected = calculation.balances.find(
        ({ date }) => date === balance.date.toISOString().slice(0, 10)
      );
      if (
        !expected ||
        balance.date.getUTCHours() !== 0 ||
        balance.date.getUTCMinutes() !== 0 ||
        balance.date.getUTCSeconds() !== 0 ||
        balance.date.getUTCMilliseconds() !== 0 ||
        expected.value.toNumber() !== balance.value
      ) {
        throw new ConflictException(
          'The imported cash transactions conflict with existing balances'
        );
      }
    }
    const data: Prisma.CashEventUncheckedCreateWithoutStateInput[] = [];
    for (const event of snapshot.events) {
      const orderId = event.orderId ? orderIds[event.orderId] : undefined;
      if (event.orderId && !orderId) {
        throw new ConflictException(
          'An activity linked to the imported cash ledger is missing'
        );
      }
      if (
        orderId &&
        !(await transaction.order.findFirst({
          where: {
            id: orderId,
            userId: scope.userId,
            accountId: scope.accountId
          }
        }))
      ) {
        throw new ConflictException(
          'An imported cash event belongs to a different account'
        );
      }
      data.push({
        ...this.normalizeEvent(event),
        importReference: event.importReference ?? null,
        sequence: event.sequence,
        orderId,
        transferId: event.transferId,
        transferCounterpartyAccountId:
          event.transferCounterparty?.accountId ?? null,
        transferCounterpartyMode: event.transferCounterparty?.mode ?? null,
        transferCounterpartyAmount: event.transferCounterparty
          ? new Prisma.Decimal(event.transferCounterparty.amount)
          : null,
        transferCounterpartyCurrency:
          event.transferCounterparty?.currency ?? null
      });
    }
    const state = await transaction.accountCashState.create({
      data: {
        ...scope,
        currency: account.currency,
        defaultUpdateCash: snapshot.defaultUpdateCash,
        includeCashInPortfolio: snapshot.includeCashInPortfolio ?? true,
        isAutomaticOpening: snapshot.isAutomaticOpening ?? false,
        openingDate,
        openingBalance: this.normalizeValue(snapshot.openingBalance.balance),
        lastSequence: Math.max(
          0,
          ...snapshot.events.map(({ sequence }) => sequence)
        ),
        events: { create: data }
      },
      include: { events: true }
    });
    await this.writeProjection(transaction, state, calculation);
  }

  public async updatePreferences(
    scope: CashAccountScope & {
      expectedRevision: number;
      defaultUpdateCash?: boolean;
      includeCashInPortfolio?: boolean;
    }
  ): Promise<CashManagementSnapshot> {
    const result = await this.inAccountTransaction(
      scope,
      async (transaction, account) => {
        const state = await this.requireState({
          transaction,
          scope,
          account,
          expectedRevision: scope.expectedRevision
        });
        await transaction.accountCashState.update({
          where: {
            accountId_userId: {
              accountId: scope.accountId,
              userId: scope.userId
            }
          },
          data: {
            defaultUpdateCash: scope.defaultUpdateCash,
            includeCashInPortfolio: scope.includeCashInPortfolio,
            revision: state.revision + 1
          }
        });
        return this.toSnapshot(
          {
            ...state,
            defaultUpdateCash:
              scope.defaultUpdateCash ?? state.defaultUpdateCash,
            includeCashInPortfolio:
              scope.includeCashInPortfolio ?? state.includeCashInPortfolio,
            revision: state.revision + 1
          },
          this.calculateState(state)
        );
      }
    );
    this.publishChange(scope.userId);
    return result;
  }

  /** Used by every legacy balance writer, under the same account lock as opening. */
  public async assertLegacyBalanceWrite(
    transaction: Prisma.TransactionClient,
    scope: CashAccountScope,
    date: Date
  ) {
    const state = await this.readState(transaction, scope);
    if (state && date >= state.openingDate) {
      throw new ConflictException(
        'Use the cash ledger to change a managed balance'
      );
    }
  }

  /** Synchronizes the persisted activity and its exact account-currency cash effect. */
  public async synchronizeOrder(
    transaction: Prisma.TransactionClient,
    order: Order & { SymbolProfile: { currency: string } },
    options: CashConfirmation & { enabled?: boolean; original?: Order }
  ): Promise<void> {
    const previousEvent = await transaction.cashEvent.findUnique({
      where: { orderId: order.id }
    });
    const scope = { accountId: order.accountId, userId: order.userId };
    const state = order.accountId
      ? await this.readState(transaction, scope)
      : null;
    // Match the civil date used by PortfolioCalculator for this activity.
    // UTC serialization can move local-midnight orders to the previous day.
    const date = format(order.date, 'yyyy-MM-dd');
    const eligible =
      !['LIABILITY', 'VALUABLE'].includes(order.type) &&
      order.date <= new Date();
    const enabled =
      eligible &&
      (options.enabled ??
        (options.original
          ? !!previousEvent
          : state?.defaultUpdateCash &&
            date >= state.openingDate.toISOString().slice(0, 10)));

    if (previousEvent && enabled && order.accountId && !state) {
      throw new ConflictException(
        'Start cash management on the destination account before moving this activity'
      );
    }
    if (previousEvent && previousEvent.accountId !== order.accountId) {
      const oldScope = {
        accountId: previousEvent.accountId,
        userId: order.userId
      };
      const oldState = await this.readState(transaction, oldScope);
      if (!oldState) {
        throw new ConflictException('The original cash ledger is missing');
      }
      const events = oldState.events.filter(
        ({ id }) => id !== previousEvent.id
      );
      this.checkNewDeficit(
        oldState,
        events.map((item) => this.toCalculatorEvent(item)),
        options.confirmNegativeBalance ?? false,
        options.cashRevisions ?? {}
      );
      await this.checkProjectionOwnership({
        transaction,
        scope: oldScope,
        openingDate: oldState.openingDate
      });
      await transaction.cashEvent.delete({
        where: { id: previousEvent.id, ...oldScope }
      });
      await this.rebuildState(transaction, { ...oldState, events });
    }

    if (!state) {
      if (enabled && order.accountId && !options.original) {
        await this.applyLegacyMovement(
          transaction,
          scope,
          await this.orderAmount(
            order,
            (
              await transaction.account.findUnique({
                where: {
                  id_userId: { id: order.accountId, userId: order.userId }
                }
              })
            ).currency
          ),
          this.toUtcDate(format(order.date, 'yyyy-MM-dd'))
        );
      }
      return;
    }
    const sameAccountEvent =
      previousEvent?.accountId === order.accountId ? previousEvent : null;
    if (!enabled && !sameAccountEvent) {
      return;
    }
    const events = state.events.filter(({ orderId }) => orderId !== order.id);
    let event: CashEvent | undefined;
    if (enabled) {
      const unchanged =
        options.original &&
        ['accountId', 'currency', 'fee', 'quantity', 'type', 'unitPrice'].every(
          (key) => order[key] === options.original[key]
        ) &&
        order.date.getTime() === options.original.date.getTime();
      const value =
        unchanged && sameAccountEvent
          ? sameAccountEvent.value.toString()
          : await this.orderAmount(order, state.currency);
      const sequence =
        sameAccountEvent?.date.toISOString().slice(0, 10) === date
          ? sameAccountEvent.sequence
          : this.nextSequence(state);
      event = {
        accountId: order.accountId,
        userId: order.userId,
        date: this.toUtcDate(date),
        sequence,
        value: new Prisma.Decimal(value),
        fee: new Prisma.Decimal(0),
        importReference: sameAccountEvent?.importReference ?? null,
        type: 'MOVEMENT',
        comment: order.comment,
        orderId: order.id,
        transferId: null,
        transferCounterpartyAccountId: null,
        transferCounterpartyMode: null,
        transferCounterpartyAmount: null,
        transferCounterpartyCurrency: null,
        id: sameAccountEvent?.id ?? randomUUID(),
        createdAt: sameAccountEvent?.createdAt ?? new Date(),
        updatedAt: new Date()
      };
      events.push(event);
    }
    this.checkNewDeficit(
      state,
      events.map((item) => this.toCalculatorEvent(item)),
      options.confirmNegativeBalance ?? false,
      options.cashRevisions ?? {}
    );
    await this.checkProjectionOwnership({
      transaction,
      scope,
      openingDate: state.openingDate
    });
    if (event) {
      const { id, createdAt, updatedAt, ...data } = event;
      await transaction.cashEvent.upsert({
        where: { id },
        create: { id, createdAt, updatedAt, ...data },
        update: data
      });
    } else {
      await transaction.cashEvent.delete({
        where: { id: sameAccountEvent.id, ...scope }
      });
    }
    await this.rebuildState(transaction, {
      ...state,
      events,
      lastSequence: Math.max(state.lastSequence, event?.sequence ?? 0)
    });
  }

  public async removeOrderEffects(
    transaction: Prisma.TransactionClient,
    orders: Order[],
    confirmation: CashConfirmation = {}
  ) {
    const accountIds = [
      ...new Set(orders.map(({ accountId }) => accountId).filter(Boolean))
    ];
    for (const accountId of accountIds) {
      const state = await this.readState(transaction, {
        accountId,
        userId: orders[0].userId
      });
      if (!state) {
        continue;
      }
      const ids = new Set(orders.map(({ id }) => id));
      const events = state.events.filter(({ orderId }) => !ids.has(orderId));
      if (events.length === state.events.length) {
        continue;
      }
      this.checkNewDeficit(
        state,
        events.map((item) => this.toCalculatorEvent(item)),
        confirmation.confirmNegativeBalance ?? false,
        confirmation.cashRevisions ?? {}
      );
      await this.checkProjectionOwnership({
        transaction,
        scope: { accountId, userId: state.userId },
        openingDate: state.openingDate
      });
      await transaction.cashEvent.deleteMany({
        where: { accountId, userId: state.userId, orderId: { in: [...ids] } }
      });
      await this.rebuildState(transaction, { ...state, events });
    }
  }

  public async transfer({
    accountIdFrom,
    accountIdTo,
    balance,
    userId,
    ...confirmation
  }: CashConfirmation & {
    accountIdFrom: string;
    accountIdTo: string;
    balance: number;
    userId: string;
  }) {
    if (
      accountIdFrom === accountIdTo ||
      !Number.isFinite(balance) ||
      balance <= 0
    ) {
      throw new BadRequestException(
        'Choose two accounts and a positive transfer amount'
      );
    }
    await this.runInAccounts(
      { accountIds: [accountIdFrom, accountIdTo], userId },
      async (transaction, accounts) => {
        const from = accounts.find(({ id }) => id === accountIdFrom);
        const to = accounts.find(({ id }) => id === accountIdTo);
        const converted = await this.exchangeRateDataService.toCurrencyAtDate(
          balance,
          from.currency,
          to.currency,
          new Date()
        );
        if (!Number.isFinite(converted)) {
          throw new BadRequestException('Exchange rate is unavailable');
        }
        const transferId = randomUUID();
        const date = format(new Date(), 'yyyy-MM-dd');
        const outgoingAmount = new Big(balance).neg().toString();
        const incomingAmount = new Big(converted).toString();

        for (const [accountId, value] of [
          [accountIdFrom, outgoingAmount],
          [accountIdTo, incomingAmount]
        ] as const) {
          const scope = { accountId, userId };
          const state = await this.readState(transaction, scope);
          if (!state) {
            await this.applyLegacyMovement(
              transaction,
              scope,
              value,
              this.toUtcDate(date),
              accountId === accountIdFrom
            );
            continue;
          }
          const isSource = accountId === accountIdFrom;
          const counterpartyAccountId = isSource ? accountIdTo : accountIdFrom;
          const counterpartyState = await this.readState(transaction, {
            accountId: counterpartyAccountId,
            userId
          });

          const event = {
            ...scope,
            id: randomUUID(),
            date: this.toUtcDate(date),
            sequence: this.nextSequence(state),
            importReference: null,
            type: 'MOVEMENT' as const,
            value: new Prisma.Decimal(this.normalizeValue(value)),
            fee: new Prisma.Decimal(0),
            comment: 'Cash transfer',
            orderId: null,
            transferId,
            transferCounterpartyAccountId: counterpartyAccountId,
            transferCounterpartyMode: counterpartyState
              ? ('CASH' as const)
              : ('LEGACY' as const),
            transferCounterpartyAmount: new Prisma.Decimal(
              this.normalizeValue(isSource ? incomingAmount : outgoingAmount)
            ),
            transferCounterpartyCurrency: isSource
              ? to.currency
              : from.currency,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          const events = [...state.events, event];
          this.checkNewDeficit(
            state,
            events.map((item) => this.toCalculatorEvent(item)),
            confirmation.confirmNegativeBalance ?? false,
            confirmation.cashRevisions ?? {}
          );
          await this.checkProjectionOwnership({
            transaction,
            scope,
            openingDate: state.openingDate
          });
          await transaction.cashEvent.create({ data: event });
          await this.rebuildState(transaction, {
            ...state,
            events,
            lastSequence: event.sequence
          });
        }
      }
    );
    this.publishChange(userId);
  }

  private async orderAmount(
    order: Order & { SymbolProfile: { currency: string } },
    currency: string
  ): Promise<string> {
    let amount = new Big(order.unitPrice).mul(order.quantity);
    if (['BUY', 'FEE'].includes(order.type)) {
      amount = amount.neg();
    }
    amount = amount.minus(order.fee);
    const from = order.currency ?? order.SymbolProfile.currency;
    if (from === currency) {
      return this.normalizeValue(amount.toString());
    }
    const converted = await this.exchangeRateDataService.toCurrencyAtDate(
      amount.toNumber(),
      from,
      currency,
      order.date
    );
    if (!Number.isFinite(converted)) {
      throw new BadRequestException('Exchange rate is unavailable');
    }
    return this.normalizeValue(new Big(converted).toString());
  }

  private async applyLegacyMovement(
    transaction: Prisma.TransactionClient,
    scope: CashAccountScope,
    amount: string,
    date: Date,
    requireFunds = false
  ) {
    const day = this.toUtcDate(date.toISOString().slice(0, 10));
    const nextDay = new Date(day.getTime() + 86400000);
    const latest = await transaction.accountBalance.findFirst({
      where: {
        ...scope,
        date: {
          lt: nextDay
        }
      },
      orderBy: { date: 'desc' }
    });
    const value = new Big(latest?.value ?? 0).plus(amount).toNumber();
    if (requireFunds && value < 0) {
      throw new ConflictException('Insufficient cash in the source account');
    }
    await transaction.accountBalance.upsert({
      where: {
        accountId_userId_date: {
          accountId: scope.accountId,
          userId: scope.userId,
          date: day
        }
      },
      create: { ...scope, date: day, value },
      update: { value }
    });
  }

  private async rebuildState(
    transaction: Prisma.TransactionClient,
    state: CashState
  ) {
    if (state.revision >= MAX_DATABASE_INTEGER) {
      throw new ConflictException('Cash revision limit reached');
    }
    const nextState = { ...state, revision: state.revision + 1 };
    await this.writeState(transaction, nextState);
    await this.writeProjection(
      transaction,
      nextState,
      this.calculateState(nextState)
    );
  }

  private checkNewDeficit(
    state: CashState,
    events: CashBalanceEvent[],
    confirmed: boolean,
    revisions?: Record<string, number>
  ) {
    this.calculate({ openingBalance: this.toOpeningBalance(state), events });
    const deficit = findNewCashDeficit({
      openingBalance: this.toOpeningBalance(state),
      previousEvents: state.events.map((event) =>
        this.toCalculatorEvent(event)
      ),
      events
    });
    if (
      deficit &&
      (!confirmed ||
        (revisions && revisions[state.accountId] !== state.revision))
    ) {
      this.requireNegativeConfirmation(
        state.accountId,
        state.revision,
        deficit.date
      );
    }
  }

  private requireNegativeConfirmation(
    accountId: string,
    revision: number | null,
    date: string
  ): never {
    throw new ConflictException({
      code: 'CASH_CONFIRMATION_REQUIRED',
      message:
        'This change would create or worsen a negative cash balance. Confirm to continue.',
      accountId,
      revision,
      negativeBalanceDate: date
    });
  }

  private calculate(
    input: Parameters<typeof calculateCashBalances>[0]
  ): CashBalanceCalculation {
    try {
      return calculateCashBalances(input);
    } catch (error) {
      if (error instanceof TypeError || error instanceof RangeError) {
        throw new BadRequestException(error.message);
      }

      throw error;
    }
  }

  private calculateState(state: CashState): CashBalanceCalculation {
    return this.calculate({
      openingBalance: this.toOpeningBalance(state),
      events: state.events.map((event) => this.toCalculatorEvent(event))
    });
  }

  private checkCurrency(account: Pick<Account, 'currency'>, state: CashState) {
    if (account.currency !== state.currency) {
      throw new ConflictException('The managed account currency has changed');
    }
  }

  private async checkProjectionOwnership({
    transaction,
    scope,
    openingDate,
    isOpening = false
  }: {
    isOpening?: boolean;
    openingDate: Date;
    scope: CashAccountScope;
    transaction: Prisma.TransactionClient;
  }): Promise<void> {
    const foreignBalance = await transaction.accountBalance.findFirst({
      select: { id: true },
      where: {
        ...scope,
        date: isOpening ? { gt: openingDate } : { gte: openingDate },
        isCashManagementProjection: false
      }
    });

    if (foreignBalance) {
      throw new ConflictException(
        'Existing account balances require an explicit reconciliation'
      );
    }
  }

  private async inAccountTransaction<T>(
    { accountId, userId }: CashAccountScope,
    operation: (
      transaction: Prisma.TransactionClient,
      account: Pick<Account, 'id' | 'currency'>
    ) => Promise<T>
  ): Promise<T> {
    return this.runInAccounts(
      { accountIds: [accountId], userId },
      (transaction, [account]) => operation(transaction, account)
    );
  }

  private nextSequence(state: CashState): number {
    if (state.lastSequence >= MAX_DATABASE_INTEGER) {
      throw new ConflictException('Cash event sequence limit reached');
    }

    return state.lastSequence + 1;
  }

  private normalizeEvent(event: CashEventInput): {
    comment: string | null;
    date: Date;
    type: CashEvent['type'];
    value: string;
    fee: string;
  } {
    const date = this.toUtcDate(event.date);
    const comment = event.comment ?? null;
    const fee = this.normalizeValue(event.fee ?? '0');
    if (new Big(fee).lt(0) || (event.type === 'CHECKPOINT' && fee !== '0')) {
      throw new BadRequestException(
        'Fees must be non-negative; reconciliations have no fee'
      );
    }

    if (comment !== null && typeof comment !== 'string') {
      throw new BadRequestException('Cash event comments must be strings');
    }

    switch (event.type) {
      case 'MOVEMENT':
        return {
          comment,
          fee,
          date,
          type: event.type,
          value: this.normalizeValue(event.amount)
        };
      case 'CHECKPOINT':
        return {
          comment,
          fee,
          date,
          type: event.type,
          value: this.normalizeValue(event.balance)
        };
      default:
        throw new BadRequestException('Unsupported cash event type');
    }
  }

  private normalizeValue(input: string): string {
    if (typeof input !== 'string') {
      throw new BadRequestException('Cash amounts must be decimal strings');
    }

    let value: Big;

    try {
      value = new Big(input);
    } catch {
      throw new BadRequestException('Cash amounts must be finite decimals');
    }

    // Reject values that Decimal(65,30) would round or overflow. The ledger
    // therefore stores exactly the amount accepted at the service boundary.
    if (value.abs().gte('1e35') || !value.eq(value.round(30, Big.roundDown))) {
      throw new BadRequestException(
        'Cash amounts support up to 35 integer and 30 fractional digits'
      );
    }

    return value.toFixed();
  }

  private publishChange(userId: string): void {
    try {
      this.eventEmitter.emit(
        PortfolioChangedEvent.getName(),
        new PortfolioChangedEvent({ userId })
      );
    } catch (error) {
      // A notification failure must not turn a committed write into a retry.
      // Durable delivery would require an outbox, beyond this service increment.
      this.logger.error(
        'Cash management committed, but the portfolio notification failed',
        error instanceof Error ? error.stack : undefined
      );
    }
  }

  private readState(
    transaction: Prisma.TransactionClient,
    scope: CashAccountScope
  ): Promise<CashState | null> {
    return transaction.accountCashState.findUnique({
      include: {
        events: { orderBy: [{ date: 'asc' }, { sequence: 'asc' }] }
      },
      where: {
        accountId_userId: { accountId: scope.accountId, userId: scope.userId }
      }
    });
  }

  private requireEvent(state: CashState, eventId: string): CashEvent {
    const event = state.events.find(({ id }) => id === eventId);

    if (!event) {
      throw new NotFoundException('Cash event not found in this account');
    }

    if (event.orderId || event.transferId) {
      throw new ConflictException(
        'Edit the linked activity or transfer instead'
      );
    }

    return event;
  }

  private async requireState({
    transaction,
    scope,
    account,
    expectedRevision
  }: {
    account: Pick<Account, 'currency'>;
    expectedRevision: number;
    scope: CashAccountScope;
    transaction: Prisma.TransactionClient;
  }): Promise<CashState> {
    if (
      !Number.isInteger(expectedRevision) ||
      expectedRevision < 0 ||
      expectedRevision > MAX_DATABASE_INTEGER
    ) {
      throw new BadRequestException('A valid cash revision is required');
    }

    let state = await this.readState(transaction, scope);
    if (!state && expectedRevision === 0) {
      const draft = await this.draftState(transaction, scope, account.currency);
      const {
        events,
        accountId,
        userId,
        currency,
        openingDate,
        openingBalance,
        isAutomaticOpening
      } = draft;
      state = await transaction.accountCashState.create({
        data: {
          accountId,
          userId,
          currency,
          openingDate,
          openingBalance,
          isAutomaticOpening,
          lastSequence: draft.lastSequence,
          events: {
            create: events.map((event) => omit(event, ['accountId', 'userId']))
          }
        },
        include: { events: true }
      });
      // Every legacy snapshot was copied to a dated reconciliation in this
      // transaction. Replace only its compatibility projection, never activities.
      await transaction.accountBalance.deleteMany({
        where: { accountId: scope.accountId, userId: scope.userId }
      });
      await this.writeProjection(
        transaction,
        state,
        this.calculateState(state)
      );
    }
    if (!state) {
      throw new ConflictException(
        'The cash history changed; reload the account'
      );
    }

    this.checkCurrency(account, state);

    if (state.revision !== expectedRevision) {
      throw new ConflictException(
        'The cash history changed; reload the account and try again'
      );
    }

    if (state.revision >= MAX_DATABASE_INTEGER) {
      throw new ConflictException('Cash revision limit reached');
    }

    return state;
  }

  private toCalculatorEvent({
    date,
    sequence,
    type,
    value,
    fee
  }: EventValue & { fee?: { toString(): string } | string }): CashBalanceEvent {
    const position = { date: date.toISOString().slice(0, 10), sequence };

    switch (type) {
      case 'MOVEMENT':
        return {
          ...position,
          amount: new Big(value.toString())
            .minus(fee?.toString() ?? 0)
            .toFixed(),
          type
        };
      case 'CHECKPOINT':
        return { ...position, balance: value.toString(), type };
      default:
        throw new BadRequestException('Unsupported cash event type');
    }
  }

  private async draftState(
    transaction: Prisma.TransactionClient,
    scope: CashAccountScope,
    currency: string
  ): Promise<CashState> {
    scope = { accountId: scope.accountId, userId: scope.userId };
    if (!currency?.trim()) {
      throw new BadRequestException('The account must have a currency');
    }
    const balances = await transaction.accountBalance.findMany({
      where: scope,
      orderBy: [{ date: 'asc' }, { id: 'asc' }]
    });
    const now = new Date();
    const events: CashEvent[] = balances.map((balance, index) => ({
      ...scope,
      id: balance.id,
      date: this.toUtcDate(format(balance.date, 'yyyy-MM-dd')),
      sequence: index + 1,
      type: 'CHECKPOINT',
      value: new Prisma.Decimal(String(balance.value)),
      importReference: null,
      fee: new Prisma.Decimal(0),
      comment: null,
      orderId: null,
      transferId: null,
      transferCounterpartyAccountId: null,
      transferCounterpartyMode: null,
      transferCounterpartyAmount: null,
      transferCounterpartyCurrency: null,
      createdAt: balance.createdAt,
      updatedAt: balance.updatedAt
    }));
    return {
      ...scope,
      currency,
      events,
      openingDate: this.toUtcDate(IMPLICIT_OPENING_DATE),
      openingBalance: new Prisma.Decimal(0),
      isAutomaticOpening: true,
      defaultUpdateCash: false,
      includeCashInPortfolio: true,
      lastSequence: events.length,
      revision: 0,
      createdAt: now,
      updatedAt: now
    };
  }

  private toOpeningBalance(state: CashState): CashOpeningBalance {
    return {
      balance: state.openingBalance.toString(),
      date: state.openingDate.toISOString().slice(0, 10),
      sequence: 0
    };
  }

  private toSnapshot(
    state: CashState,
    calculation: CashBalanceCalculation
  ): CashManagementSnapshot {
    const events = state.events
      .map((event) => {
        return {
          ...this.toCalculatorEvent(event),
          ...(event.type === 'MOVEMENT'
            ? { amount: event.value.toString() }
            : {}),
          ...(event.fee && !new Big(event.fee.toString()).eq(0)
            ? { fee: event.fee.toString() }
            : {}),
          comment: event.comment,
          ...(event.importReference
            ? { importReference: event.importReference }
            : {}),
          id: event.id,
          ...(event.orderId ? { orderId: event.orderId } : {}),
          ...(event.transferId ? { transferId: event.transferId } : {}),
          ...(event.transferCounterpartyAccountId &&
          event.transferCounterpartyMode &&
          event.transferCounterpartyAmount !== null &&
          event.transferCounterpartyCurrency
            ? {
                transferCounterparty: {
                  accountId: event.transferCounterpartyAccountId,
                  mode: event.transferCounterpartyMode,
                  amount: event.transferCounterpartyAmount.toString(),
                  currency: event.transferCounterpartyCurrency
                }
              }
            : {})
        };
      })
      .sort((left, right) => {
        if (left.date !== right.date) {
          return left.date < right.date ? -1 : 1;
        }

        return left.sequence - right.sequence;
      });

    return {
      accountId: state.accountId,
      balances: this.visibleBalances(state, calculation).map(
        ({ date, value }) => {
          return { date, value: value.toString() };
        }
      ),
      currency: state.currency,
      defaultUpdateCash: state.defaultUpdateCash ?? false,
      includeCashInPortfolio: state.includeCashInPortfolio ?? true,
      isAutomaticOpening: state.isAutomaticOpening ?? false,
      events,
      minimumBalance: {
        ...calculation.minimumBalance,
        value: calculation.minimumBalance.value.toString()
      },
      openingBalance: this.toOpeningBalance(state),
      revision: state.revision
    };
  }

  private toUtcDate(date: string): Date {
    this.calculate({
      openingBalance: { balance: '0', date, sequence: 0 },
      events: []
    });

    if (date.startsWith('0000-')) {
      throw new BadRequestException('Cash dates must have a positive year');
    }

    return new Date(`${date}T00:00:00.000Z`);
  }

  private async writeProjection(
    transaction: Prisma.TransactionClient,
    state: CashState,
    calculation: CashBalanceCalculation
  ): Promise<void> {
    const scope = { accountId: state.accountId, userId: state.userId };
    const balances = this.visibleBalances(state, calculation).map(
      ({ date, value }) => {
        // Compatibility boundary: AccountBalance remains Float. These approximate
        // projections must never be used to reconstruct the decimal journal.
        const projectedValue = value.toNumber();

        if (!Number.isFinite(projectedValue)) {
          throw new BadRequestException(
            'Cash balance cannot be projected as a number'
          );
        }

        return {
          date: new Date(`${date}T00:00:00.000Z`),
          value: projectedValue
        };
      }
    );

    for (const { date, value } of balances) {
      await transaction.accountBalance.upsert({
        create: { ...scope, date, isCashManagementProjection: true, value },
        update: { isCashManagementProjection: true, value },
        where: {
          accountId_userId_date: {
            accountId: scope.accountId,
            userId: scope.userId,
            date
          }
        }
      });
    }

    await transaction.accountBalance.deleteMany({
      where: {
        ...scope,
        date: {
          gte: state.openingDate,
          notIn: balances.map(({ date }) => date)
        },
        isCashManagementProjection: true
      }
    });
  }

  private visibleBalances(
    state: CashState,
    calculation: CashBalanceCalculation
  ) {
    return state.isAutomaticOpening
      ? calculation.balances.filter(
          ({ date }) => date !== IMPLICIT_OPENING_DATE
        )
      : calculation.balances;
  }

  private async writeState(
    transaction: Prisma.TransactionClient,
    state: CashState
  ): Promise<void> {
    await transaction.accountCashState.update({
      data: { lastSequence: state.lastSequence, revision: state.revision },
      where: {
        accountId_userId: { accountId: state.accountId, userId: state.userId }
      }
    });
  }
}
