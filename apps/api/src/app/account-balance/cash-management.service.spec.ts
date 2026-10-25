import { PortfolioChangedEvent } from '@ghostfolio/api/events/portfolio-changed.event';
import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';

import {
  BadRequestException,
  ConflictException,
  Logger,
  NotFoundException
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Order, Prisma } from '@prisma/client';
import { format, parseISO } from 'date-fns';

import { CashManagementService } from './cash-management.service';

const scope = { accountId: 'account-1', userId: 'user-1' };
const openingDate = '2026-10-01';
const maximumCounter = 2147483647;

type Operation = 'open' | 'get' | 'create' | 'update' | 'delete';
type Mutation = Extract<Operation, 'create' | 'update' | 'delete'>;
type AmountOperation =
  | 'opening'
  | 'movement'
  | 'checkpoint'
  | 'movement update'
  | 'checkpoint update';

interface StoredEvent {
  accountId: string;
  comment: string | null;
  createdAt: Date;
  date: Date;
  id: string;
  orderId?: string | null;
  fee?: Prisma.Decimal;
  sequence: number;
  type: 'MOVEMENT' | 'CHECKPOINT';
  updatedAt: Date;
  userId: string;
  value: Prisma.Decimal;
}

interface StoredState {
  accountId: string;
  currency: string;
  events: StoredEvent[];
  lastSequence: number;
  openingBalance: Prisma.Decimal;
  openingDate: Date;
  revision: number;
  userId: string;
}

describe('CashManagementService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('activity dates and daily cash projections', () => {
    it('keeps BUY, DIVIDEND and SELL cash effects on the same civil dates as the orders', async () => {
      const harness = createHarness(
        makeState({
          openingDate: utcDate('2026-01-01'),
          openingBalance: new Prisma.Decimal('5000')
        })
      );
      const cases = [
        {
          date: '2026-02-02',
          type: 'BUY',
          quantity: 500,
          unitPrice: 5.98,
          fee: 1.5,
          amount: '-2991.5'
        },
        {
          date: '2026-04-21',
          type: 'DIVIDEND',
          quantity: 500,
          unitPrice: 0.72,
          fee: 0,
          amount: '360'
        },
        {
          date: '2026-09-01',
          type: 'SELL',
          quantity: 500,
          unitPrice: 6.668,
          fee: 1,
          amount: '3333'
        }
      ] as const;

      for (const [index, item] of cases.entries()) {
        // The activity controller uses parseISO on dates without a time.
        const order = {
          ...scope,
          id: `order-${index}`,
          date: parseISO(item.date),
          type: item.type,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          fee: item.fee,
          currency: 'EUR',
          comment: null,
          SymbolProfile: { currency: 'EUR' }
        } as unknown as Order & { SymbolProfile: { currency: string } };

        expect(format(order.date, 'yyyy-MM-dd')).toBe(item.date);
        await harness.service.synchronizeOrder(harness.tx as never, order, {
          enabled: true
        });

        const { create } = harness.tx.cashEvent.upsert.mock.calls.at(-1)[0];
        expect(create.date.toISOString().slice(0, 10)).toBe(item.date);
        expect(create.value.toString()).toBe(item.amount);
      }

      const snapshot = await harness.service.get(scope);
      expect(snapshot.events.map(({ date }) => date)).toEqual(
        cases.map(({ date }) => date)
      );
      expect(snapshot.balances).toEqual([
        { date: '2026-01-01', value: '5000' },
        { date: '2026-02-02', value: '2008.5' },
        { date: '2026-04-21', value: '2368.5' },
        { date: '2026-09-01', value: '5701.5' }
      ]);

      const projectedDates = harness.tx.accountBalance.upsert.mock.calls.map(
        ([{ create }]) => create.date.toISOString().slice(0, 10)
      );
      for (const { date } of cases) {
        expect(projectedDates).toContain(date);
      }
      expect(projectedDates).not.toContain('2026-02-01');
      expect(projectedDates).not.toContain('2026-08-31');
    });

    it('moves a previously misdated linked cash event when the order is resynchronized', async () => {
      const oldEvent = {
        ...storedEvent({
          date: '2026-02-01',
          id: 'linked-buy',
          sequence: 1,
          type: 'MOVEMENT',
          value: '-2991.5'
        }),
        orderId: 'buy-order'
      };
      const harness = createHarness(
        makeState({
          openingDate: utcDate('2026-01-01'),
          openingBalance: new Prisma.Decimal('5000'),
          events: [oldEvent],
          lastSequence: 1
        })
      );
      const order = {
        ...scope,
        id: 'buy-order',
        date: parseISO('2026-02-02'),
        type: 'BUY',
        quantity: 500,
        unitPrice: 5.98,
        fee: 1.5,
        currency: 'EUR',
        comment: null,
        SymbolProfile: { currency: 'EUR' }
      } as unknown as Order & { SymbolProfile: { currency: string } };

      await harness.service.synchronizeOrder(harness.tx as never, order, {
        enabled: true,
        original: order
      });

      const snapshot = await harness.service.get(scope);
      expect(snapshot.events).toHaveLength(1);
      expect(snapshot.events[0]).toMatchObject({
        id: 'linked-buy',
        orderId: 'buy-order',
        date: '2026-02-02',
        amount: '-2991.5'
      });
      expect(snapshot.balances).toEqual([
        { date: '2026-01-01', value: '5000' },
        { date: '2026-02-02', value: '2008.5' }
      ]);
      expect(harness.tx.accountBalance.deleteMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          isCashManagementProjection: true,
          date: expect.objectContaining({
            notIn: [utcDate('2026-01-01'), utcDate('2026-02-02')]
          })
        })
      });
    });
  });

  describe('account scope and reads', () => {
    it('returns an empty zero-based journal without creating an opening balance', async () => {
      const harness = createHarness(null);

      await expect(harness.service.get(scope)).resolves.toMatchObject({
        revision: 0,
        events: [],
        balances: [],
        isAutomaticOpening: true
      });

      expectLockedAccount(harness);
      expectScopedStateRead(harness);
      expectNoWrites(harness);
      expect(harness.emit).not.toHaveBeenCalled();
    });

    it('returns a serialized snapshot without writing or publishing on a read', async () => {
      const harness = createHarness(reconciledState());

      await expect(harness.service.get(scope)).resolves.toEqual({
        accountId: scope.accountId,
        balances: [
          { date: '2026-10-01', value: '100' },
          { date: '2026-10-02', value: '140' },
          { date: '2026-10-04', value: '500' },
          { date: '2026-10-06', value: '440' }
        ],
        currency: 'EUR',
        defaultUpdateCash: false,
        includeCashInPortfolio: true,
        isAutomaticOpening: false,
        events: [
          {
            amount: '40',
            comment: null,
            date: '2026-10-02',
            id: 'deposit',
            sequence: 1,
            type: 'MOVEMENT'
          },
          {
            balance: '500',
            comment: null,
            date: '2026-10-04',
            id: 'reconciliation',
            sequence: 2,
            type: 'CHECKPOINT'
          },
          {
            amount: '-60',
            comment: null,
            date: '2026-10-06',
            id: 'withdrawal',
            sequence: 3,
            type: 'MOVEMENT'
          }
        ],
        minimumBalance: {
          date: '2026-10-01',
          sequence: 0,
          value: '100'
        },
        openingBalance: {
          balance: '100',
          date: '2026-10-01',
          sequence: 0
        },
        revision: 3
      });

      expectNoWrites(harness);
      expect(harness.emit).not.toHaveBeenCalled();
    });

    it.each<Operation>(['open', 'get', 'create', 'update', 'delete'])(
      'rejects %s when the account does not exist in the owner scope',
      async (operation) => {
        const harness = createHarness(reconciledState());
        harness.tx.$queryRaw.mockResolvedValue([]);

        await expect(invoke(harness, operation)).rejects.toBeInstanceOf(
          NotFoundException
        );

        expectLockedAccount(harness);
        expect(harness.tx.accountCashState.findUnique).not.toHaveBeenCalled();
        expectNoWrites(harness);
        expect(harness.emit).not.toHaveBeenCalled();
      }
    );

    it('rejects opening an account without an explicit currency', async () => {
      const harness = createHarness(null);
      harness.tx.$queryRaw.mockResolvedValue([
        { currency: null, id: scope.accountId }
      ]);

      await expect(invoke(harness, 'open')).rejects.toBeInstanceOf(
        BadRequestException
      );

      expectNoWrites(harness);
      expect(harness.emit).not.toHaveBeenCalled();
    });

    it('rejects an account currency that differs from the stored ledger currency', async () => {
      const harness = createHarness(makeState({ currency: 'USD' }));

      await expect(harness.service.get(scope)).rejects.toBeInstanceOf(
        ConflictException
      );

      expectNoWrites(harness);
      expect(harness.emit).not.toHaveBeenCalled();
    });

    it.each<Mutation>(['create', 'update', 'delete'])(
      'does not implicitly activate an unmanaged account during %s',
      async (operation) => {
        const harness = createHarness(null);

        await expect(invoke(harness, operation)).rejects.toBeInstanceOf(
          ConflictException
        );

        expectNoWrites(harness);
        expect(harness.emit).not.toHaveBeenCalled();
      }
    );

    it.each(['update', 'delete'] as const)(
      'rejects %s of an event outside the selected account history',
      async (operation) => {
        const harness = createHarness(reconciledState());
        const input = {
          ...scope,
          eventId: 'event-from-another-account',
          expectedRevision: 3
        };
        const result =
          operation === 'update'
            ? harness.service.updateEvent({
                ...input,
                event: {
                  amount: '10',
                  date: '2026-10-02',
                  type: 'MOVEMENT'
                }
              })
            : harness.service.deleteEvent(input);

        await expect(result).rejects.toBeInstanceOf(NotFoundException);

        expectScopedStateRead(harness);
        expectNoWrites(harness);
        expect(harness.emit).not.toHaveBeenCalled();
      }
    );
  });

  describe('opening and legacy balances', () => {
    it('persists an explicit opening and limits projection writes to its managed dates', async () => {
      const harness = createHarness(null);

      const result = await harness.service.open({
        ...scope,
        balance: '500.00',
        date: '2026-10-25'
      });

      expect(result).toEqual({
        accountId: scope.accountId,
        balances: [{ date: '2026-10-25', value: '500' }],
        currency: 'EUR',
        defaultUpdateCash: false,
        includeCashInPortfolio: true,
        isAutomaticOpening: false,
        events: [],
        minimumBalance: {
          date: '2026-10-25',
          sequence: 0,
          value: '500'
        },
        openingBalance: {
          balance: '500',
          date: '2026-10-25',
          sequence: 0
        },
        revision: 0
      });
      expect(harness.tx.accountCashState.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ...scope,
            currency: 'EUR',
            openingDate: utcDate('2026-10-25')
          })
        })
      );
      expect(harness.getState().openingBalance.toFixed()).toBe('500');
      expect(harness.getState().lastSequence).toBe(0);
      expect(harness.getState().revision).toBe(0);
      expect(harness.tx.accountBalance.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ...scope,
            date: { gt: utcDate('2026-10-25') },
            isCashManagementProjection: false
          })
        })
      );
      expectProjection(harness, result.balances, '2026-10-25');
      expect(harness.tx.cashEvent.create).not.toHaveBeenCalled();
      expectPublished(harness);
    });

    it('does not replace an existing opening', async () => {
      const harness = createHarness(reconciledState());

      await expect(invoke(harness, 'open')).rejects.toBeInstanceOf(
        ConflictException
      );

      expectNoWrites(harness);
      expect(harness.emit).not.toHaveBeenCalled();
    });

    it('rejects opening before a later manual balance instead of deleting that history', async () => {
      const harness = createHarness(null);
      harness.tx.accountBalance.findFirst.mockResolvedValue({
        ...scope,
        date: utcDate('2026-10-04'),
        id: 'legacy-balance',
        isCashManagementProjection: false,
        value: 450
      });

      await expect(invoke(harness, 'open')).rejects.toBeInstanceOf(
        ConflictException
      );

      expectNoWrites(harness);
      expect(harness.emit).not.toHaveBeenCalled();
    });

    it.each<Mutation>(['create', 'update', 'delete'])(
      'rejects %s when manual balances conflict with the managed interval',
      async (operation) => {
        const harness = createHarness(reconciledState());
        harness.tx.accountBalance.findFirst.mockResolvedValue({
          ...scope,
          date: utcDate(openingDate),
          id: 'manual-opening-day-balance',
          isCashManagementProjection: false,
          value: 300
        });

        await expect(invoke(harness, operation)).rejects.toBeInstanceOf(
          ConflictException
        );

        expect(harness.tx.accountBalance.findFirst).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              ...scope,
              date: { gte: utcDate(openingDate) },
              isCashManagementProjection: false
            })
          })
        );
        expectNoWrites(harness);
        expect(harness.emit).not.toHaveBeenCalled();
      }
    );
  });

  describe('events and rebuilding the daily projection', () => {
    it('persists two separate deposits of 400 with distinct sequences and revisions', async () => {
      const harness = createHarness(makeState());

      const first = await harness.service.createEvent({
        ...scope,
        event: {
          amount: '400.00',
          comment: 'First deposit',
          date: '2026-10-02',
          type: 'MOVEMENT'
        },
        expectedRevision: 0
      });
      const second = await harness.service.createEvent({
        ...scope,
        event: { amount: '400', date: '2026-10-03', type: 'MOVEMENT' },
        expectedRevision: 1
      });

      expect(first.revision).toBe(1);
      expect(second.revision).toBe(2);
      expect(second.balances).toEqual([
        { date: '2026-10-01', value: '0' },
        { date: '2026-10-02', value: '400' },
        { date: '2026-10-03', value: '800' }
      ]);
      expect(second.events).toEqual([
        {
          amount: '400',
          comment: 'First deposit',
          date: '2026-10-02',
          id: 'created-event-1',
          sequence: 1,
          type: 'MOVEMENT'
        },
        {
          amount: '400',
          comment: null,
          date: '2026-10-03',
          id: 'created-event-2',
          sequence: 2,
          type: 'MOVEMENT'
        }
      ]);
      expect(harness.getState().lastSequence).toBe(2);
      expect(harness.getState().revision).toBe(2);
      expect(harness.tx.cashEvent.create).toHaveBeenCalledTimes(2);
      expect(harness.emit).toHaveBeenCalledTimes(2);
    });

    it('propagates a backdated movement only until the next checkpoint', async () => {
      const harness = createHarness(reconciledState());

      const result = await invoke(harness, 'create');

      expect(result.balances).toEqual([
        { date: '2026-10-01', value: '100' },
        { date: '2026-10-02', value: '140' },
        { date: '2026-10-03', value: '165' },
        { date: '2026-10-04', value: '500' },
        { date: '2026-10-06', value: '440' }
      ]);
      expect(result.revision).toBe(4);
      expect(harness.getState().lastSequence).toBe(4);
      expectProjection(harness, result.balances);
      expectPublished(harness);
    });

    it('updates a movement amount while preserving its sequence on the same date', async () => {
      const harness = createHarness(reconciledState());

      const result = await invoke(harness, 'update');

      expect(result.balances).toEqual([
        { date: '2026-10-01', value: '100' },
        { date: '2026-10-02', value: '110' },
        { date: '2026-10-04', value: '500' },
        { date: '2026-10-06', value: '440' }
      ]);
      expect(result.events.find(({ id }) => id === 'deposit')).toEqual({
        amount: '10',
        comment: null,
        date: '2026-10-02',
        id: 'deposit',
        sequence: 1,
        type: 'MOVEMENT'
      });
      expect(result.revision).toBe(4);
      expect(harness.getState().revision).toBe(4);
      expect(harness.getState().lastSequence).toBe(3);
      expect(harness.tx.cashEvent.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ ...scope, id: 'deposit' })
        })
      );
      expectProjection(harness, result.balances);
    });

    it('assigns a new sequence when a movement changes date and removes the old daily row', async () => {
      const harness = createHarness(reconciledState());

      const result = await harness.service.updateEvent({
        ...scope,
        event: { amount: '40', date: '2026-10-05', type: 'MOVEMENT' },
        eventId: 'deposit',
        expectedRevision: 3
      });

      expect(result.balances).toEqual([
        { date: '2026-10-01', value: '100' },
        { date: '2026-10-04', value: '500' },
        { date: '2026-10-05', value: '540' },
        { date: '2026-10-06', value: '480' }
      ]);
      expect(result.events.find(({ id }) => id === 'deposit')).toEqual(
        expect.objectContaining({ date: '2026-10-05', sequence: 4 })
      );
      expect(harness.getState().lastSequence).toBe(4);
      expectProjection(harness, result.balances);
    });

    it('updates an absolute checkpoint and can explicitly clear its comment', async () => {
      const state = reconciledState();
      state.events[1].comment = 'Reconciled with bank statement';
      const harness = createHarness(state);

      const result = await harness.service.updateEvent({
        ...scope,
        event: {
          balance: '450.00',
          comment: null,
          date: '2026-10-04',
          type: 'CHECKPOINT'
        },
        eventId: 'reconciliation',
        expectedRevision: 3
      });

      expect(result.balances).toEqual([
        { date: '2026-10-01', value: '100' },
        { date: '2026-10-02', value: '140' },
        { date: '2026-10-04', value: '450' },
        { date: '2026-10-06', value: '390' }
      ]);
      expect(result.events.find(({ id }) => id === 'reconciliation')).toEqual({
        balance: '450',
        comment: null,
        date: '2026-10-04',
        id: 'reconciliation',
        sequence: 2,
        type: 'CHECKPOINT'
      });
      expectProjection(harness, result.balances);
    });

    it('removes a movement and its obsolete daily row without shifting the checkpoint', async () => {
      const harness = createHarness(reconciledState());

      const result = await invoke(harness, 'delete');

      expect(result.balances).toEqual([
        { date: '2026-10-01', value: '100' },
        { date: '2026-10-04', value: '500' },
        { date: '2026-10-06', value: '440' }
      ]);
      expect(result.events.map(({ id }) => id)).toEqual([
        'reconciliation',
        'withdrawal'
      ]);
      expect(result.revision).toBe(4);
      expect(harness.getState().lastSequence).toBe(3);
      expect(harness.tx.cashEvent.delete).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ ...scope, id: 'deposit' })
        })
      );
      expectProjection(harness, result.balances);
    });

    it('reconnects the history on both sides of a deleted checkpoint', async () => {
      const harness = createHarness(reconciledState());

      const result = await harness.service.deleteEvent({
        ...scope,
        eventId: 'reconciliation',
        expectedRevision: 3
      });

      expect(result.balances).toEqual([
        { date: '2026-10-01', value: '100' },
        { date: '2026-10-02', value: '140' },
        { date: '2026-10-06', value: '80' }
      ]);
      expect(result.minimumBalance).toEqual({
        date: '2026-10-06',
        sequence: 3,
        value: '80'
      });
      expectProjection(harness, result.balances);
    });

    it('does not reuse the sequence of a deleted event', async () => {
      const harness = createHarness(reconciledState());

      await harness.service.deleteEvent({
        ...scope,
        eventId: 'withdrawal',
        expectedRevision: 3
      });
      const result = await harness.service.createEvent({
        ...scope,
        event: { amount: '-20', date: '2026-10-06', type: 'MOVEMENT' },
        expectedRevision: 4
      });

      expect(result.events.find(({ id }) => id === 'created-event-1')).toEqual(
        expect.objectContaining({ amount: '-20', sequence: 4 })
      );
      expect(result.balances).toEqual([
        { date: '2026-10-01', value: '100' },
        { date: '2026-10-02', value: '140' },
        { date: '2026-10-04', value: '500' },
        { date: '2026-10-06', value: '480' }
      ]);
      expect(result.revision).toBe(5);
      expect(harness.getState().lastSequence).toBe(4);
    });

    it('keeps an intermediate deficit even when the closing balance is positive', async () => {
      const harness = createHarness(
        makeState({ openingBalance: new Prisma.Decimal('50') })
      );

      await harness.service.createEvent({
        ...scope,
        confirmNegativeBalance: true,
        event: { amount: '-100', date: openingDate, type: 'MOVEMENT' },
        expectedRevision: 0
      });
      const result = await harness.service.createEvent({
        ...scope,
        confirmNegativeBalance: true,
        event: { amount: '200', date: openingDate, type: 'MOVEMENT' },
        expectedRevision: 1
      });

      expect(result.balances).toEqual([{ date: '2026-10-01', value: '150' }]);
      expect(result.minimumBalance).toEqual({
        date: '2026-10-01',
        sequence: 1,
        value: '-50'
      });
    });

    it('changes a movement into an absolute reconciliation without duplicating it', async () => {
      const harness = createHarness(reconciledState());

      await expect(
        harness.service.updateEvent({
          ...scope,
          event: { balance: '40', date: '2026-10-02', type: 'CHECKPOINT' },
          eventId: 'deposit',
          expectedRevision: 3
        })
      ).resolves.toMatchObject({
        revision: 4,
        events: expect.arrayContaining([
          expect.objectContaining({
            id: 'deposit',
            type: 'CHECKPOINT',
            balance: '40'
          })
        ])
      });
      expect(harness.getState().events).toHaveLength(3);
    });

    it.each(['create', 'update'] as const)(
      'rejects a %s before the opening boundary',
      async (operation) => {
        const harness = createHarness(reconciledState());
        const input = {
          ...scope,
          event: {
            amount: '10',
            date: '2026-09-30',
            type: 'MOVEMENT' as const
          },
          expectedRevision: 3
        };
        const result =
          operation === 'create'
            ? harness.service.createEvent(input)
            : harness.service.updateEvent({ ...input, eventId: 'deposit' });

        await expect(result).rejects.toBeInstanceOf(BadRequestException);

        expectNoWrites(harness);
        expect(harness.emit).not.toHaveBeenCalled();
      }
    );
  });

  describe('decimal persistence and serialization', () => {
    it('persists exact decimals and returns 0.1 plus 0.2 as the string 0.3', async () => {
      const harness = createHarness(
        makeState({ openingBalance: new Prisma.Decimal('0.1') })
      );

      const result = await harness.service.createEvent({
        ...scope,
        event: { amount: '0.2000', date: openingDate, type: 'MOVEMENT' },
        expectedRevision: 0
      });

      expect(result.openingBalance.balance).toBe('0.1');
      expect(result.events[0]).toEqual(
        expect.objectContaining({ amount: '0.2' })
      );
      expect(result.balances).toEqual([{ date: '2026-10-01', value: '0.3' }]);
      expect(harness.getState().events[0].value.toFixed()).toBe('0.2');
      expect(JSON.parse(JSON.stringify(result))).toEqual(result);
      expectProjection(harness, result.balances);
    });

    it('preserves a value at the decimal precision limit in the ledger and snapshot', async () => {
      const harness = createHarness(null);
      const balance =
        '99999999999999999999999999999999999.999999999999999999999999999999';

      const result = await harness.service.open({
        ...scope,
        balance,
        date: openingDate
      });

      expectExactDecimal(result.openingBalance.balance, balance);
      expect(result.balances).toHaveLength(1);
      expect(result.balances[0].date).toBe(openingDate);
      expectExactDecimal(result.balances[0].value, balance);
      expect(harness.getState().openingBalance.toFixed()).toBe(balance);
      expect(
        harness.tx.accountCashState.create.mock.calls[0][0].data.openingBalance
      ).toBe(balance);
    });

    it('stores an exponential checkpoint as an exact fixed decimal string', async () => {
      const harness = createHarness(reconciledState());
      const balance = '0.000000000000000000000000000001';

      const result = await harness.service.createEvent({
        ...scope,
        event: { balance: '1e-30', date: '2026-10-07', type: 'CHECKPOINT' },
        expectedRevision: 3
      });

      const checkpoint = result.events.find(
        ({ id }) => id === 'created-event-1'
      );
      expect(checkpoint).toEqual(
        expect.objectContaining({
          balance: expect.any(String),
          type: 'CHECKPOINT'
        })
      );
      expectExactDecimal(
        'balance' in checkpoint ? checkpoint.balance : '',
        balance
      );
      expect(result.minimumBalance).toEqual({
        date: '2026-10-07',
        sequence: 4,
        value: expect.any(String)
      });
      expectExactDecimal(result.minimumBalance.value, balance);
      expect(
        harness
          .getState()
          .events.find(({ id }) => id === 'created-event-1')
          .value.toFixed()
      ).toBe(balance);
      expect(harness.tx.cashEvent.create.mock.calls[0][0].data.value).toBe(
        balance
      );
    });

    it.each(
      (
        [
          'opening',
          'movement',
          'checkpoint',
          'movement update',
          'checkpoint update'
        ] as AmountOperation[]
      ).flatMap((operation) => {
        return [
          { label: '35 integer digits overflow', operation, value: '1e35' },
          { label: 'fraction requiring rounding', operation, value: '1e-31' },
          { label: 'JavaScript number', operation, value: 0.2 }
        ];
      })
    )(
      'rejects $label for $operation before writing',
      async ({ operation, value }) => {
        const harness = createHarness(
          operation === 'opening' ? null : reconciledState()
        );

        await expect(
          writeAmount(harness, operation, value as string)
        ).rejects.toBeInstanceOf(BadRequestException);

        expectNoWrites(harness);
        expect(harness.emit).not.toHaveBeenCalled();
      }
    );

    it('rejects negative overflow as well as positive overflow', async () => {
      const harness = createHarness(null);

      await expect(
        harness.service.open({ ...scope, balance: '-1e35', date: openingDate })
      ).rejects.toBeInstanceOf(BadRequestException);

      expectNoWrites(harness);
    });

    it.each(['0000-01-01', '2026-02-30', '2026-10-01T00:00:00.000Z'])(
      'rejects a non-civil or invalid opening date %s',
      async (date) => {
        const harness = createHarness(null);

        await expect(
          harness.service.open({ ...scope, balance: '0', date })
        ).rejects.toBeInstanceOf(BadRequestException);

        expectNoWrites(harness);
        expect(harness.emit).not.toHaveBeenCalled();
      }
    );
  });

  describe('revision and sequence boundaries', () => {
    it.each([undefined, -1, 0.5, maximumCounter + 1])(
      'requires an explicit revision within the integer range (%s)',
      async (expectedRevision) => {
        const harness = createHarness(reconciledState());

        await expect(
          harness.service.createEvent({
            ...scope,
            event: { amount: '25', date: '2026-10-03', type: 'MOVEMENT' },
            expectedRevision
          })
        ).rejects.toBeInstanceOf(BadRequestException);

        expectNoWrites(harness);
        expect(harness.emit).not.toHaveBeenCalled();
      }
    );

    it.each<Mutation>(['create', 'update', 'delete'])(
      'rejects a stale revision during %s without retrying or publishing',
      async (operation) => {
        const harness = createHarness(reconciledState());

        await expect(invoke(harness, operation, 2)).rejects.toBeInstanceOf(
          ConflictException
        );

        expect(harness.prisma.$transaction).toHaveBeenCalledTimes(1);
        expectNoWrites(harness);
        expect(harness.emit).not.toHaveBeenCalled();
      }
    );

    it.each<Mutation>(['create', 'update', 'delete'])(
      'rejects %s when the persisted revision cannot be incremented',
      async (operation) => {
        const harness = createHarness(
          reconciledState({ revision: maximumCounter })
        );

        await expect(
          invoke(harness, operation, maximumCounter)
        ).rejects.toThrow();

        expectNoWrites(harness);
        expect(harness.emit).not.toHaveBeenCalled();
      }
    );

    it.each(['create', 'move'] as const)(
      'rejects %s when a new sequence would exceed the stored integer range',
      async (operation) => {
        const harness = createHarness(
          reconciledState({ lastSequence: maximumCounter })
        );
        const result =
          operation === 'create'
            ? invoke(harness, 'create')
            : harness.service.updateEvent({
                ...scope,
                event: {
                  amount: '40',
                  date: '2026-10-05',
                  type: 'MOVEMENT'
                },
                eventId: 'deposit',
                expectedRevision: 3
              });

        await expect(result).rejects.toThrow();

        expectNoWrites(harness);
        expect(harness.emit).not.toHaveBeenCalled();
      }
    );

    it('permits an edit on the same date and a deletion without allocating a sequence', async () => {
      const harness = createHarness(
        reconciledState({ lastSequence: maximumCounter })
      );

      const updated = await invoke(harness, 'update');
      const deleted = await harness.service.deleteEvent({
        ...scope,
        eventId: 'deposit',
        expectedRevision: 4
      });

      expect(updated.events.find(({ id }) => id === 'deposit').sequence).toBe(
        1
      );
      expect(updated.revision).toBe(4);
      expect(deleted.revision).toBe(5);
      expect(harness.getState().lastSequence).toBe(maximumCounter);
    });
  });

  describe('transaction boundaries and notifications', () => {
    it('uses the locked transaction client for all reads and writes', async () => {
      const harness = createHarness(reconciledState());
      const lock = deferred();
      harness.tx.$queryRaw.mockImplementation(async () => {
        await lock.promise;
        return [{ currency: 'EUR', id: scope.accountId }];
      });

      const operation = invoke(harness, 'create');
      await new Promise<void>((resolve) => {
        setImmediate(resolve);
      });

      expect(harness.tx.$queryRaw).toHaveBeenCalledTimes(1);
      expect(harness.tx.accountCashState.findUnique).not.toHaveBeenCalled();

      lock.resolve();
      await operation;

      expect(harness.prisma.$transaction).toHaveBeenCalledWith(
        expect.any(Function),
        { isolationLevel: 'ReadCommitted', maxWait: 5000, timeout: 15000 }
      );
      expectLockedAccount(harness);
      expectScopedStateRead(harness);
      expect(harness.tx.cashEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ...scope,
            date: utcDate('2026-10-03'),
            sequence: 4,
            type: 'MOVEMENT'
          })
        })
      );
      expect(harness.tx.accountCashState.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { accountId_userId: scope }
        })
      );
      expectRootClientUnused(harness);
    });

    it('waits for the transaction to resolve before emitting the portfolio event', async () => {
      const harness = createHarness(reconciledState());
      const callbackFinished = deferred();
      const commit = deferred();
      harness.prisma.$transaction.mockImplementation(async (callback) => {
        const result = await callback(harness.tx);
        callbackFinished.resolve();
        await commit.promise;
        return result;
      });

      const operation = invoke(harness, 'create');
      await callbackFinished.promise;

      expect(harness.tx.cashEvent.create).toHaveBeenCalledTimes(1);
      expect(harness.emit).not.toHaveBeenCalled();

      commit.resolve();
      await operation;

      expectPublished(harness);
    });

    it('does not emit when commit rejects after the transaction callback finishes', async () => {
      const harness = createHarness(reconciledState());
      const error = new Error('Commit failed');
      harness.prisma.$transaction.mockImplementation(async (callback) => {
        await callback(harness.tx);
        throw error;
      });

      await expect(invoke(harness, 'create')).rejects.toBe(error);

      expect(harness.tx.cashEvent.create).toHaveBeenCalledTimes(1);
      expect(harness.emit).not.toHaveBeenCalled();
      expect(harness.prisma.$transaction).toHaveBeenCalledTimes(1);
      expectRootClientUnused(harness);
    });

    it.each([
      'event write',
      'revision write',
      'projection upsert',
      'projection cleanup'
    ] as const)('propagates a failed %s without publishing', async (stage) => {
      const harness = createHarness(reconciledState());
      const error = new Error(`Failed ${stage}`);
      const write = {
        'event write': harness.tx.cashEvent.create,
        'projection cleanup': harness.tx.accountBalance.deleteMany,
        'projection upsert': harness.tx.accountBalance.upsert,
        'revision write': harness.tx.accountCashState.update
      }[stage];
      write.mockRejectedValueOnce(error);

      await expect(invoke(harness, 'create')).rejects.toBe(error);

      expect(harness.prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(harness.emit).not.toHaveBeenCalled();
      expectRootClientUnused(harness);
    });

    it('retries a transient transaction conflict from a fresh snapshot and publishes once', async () => {
      const harness = createHarness(makeState());
      const retry = createHarness(makeState());
      harness.prisma.$transaction
        .mockImplementationOnce(async (callback) => {
          await callback(harness.tx);
          throw prismaError('P2034');
        })
        .mockImplementationOnce((callback) => callback(retry.tx));

      const result = await harness.service.createEvent({
        ...scope,
        event: { amount: '400', date: '2026-10-02', type: 'MOVEMENT' },
        expectedRevision: 0
      });

      expect(result.balances).toEqual([
        { date: '2026-10-01', value: '0' },
        { date: '2026-10-02', value: '400' }
      ]);
      expect(result.revision).toBe(1);
      expect(harness.prisma.$transaction).toHaveBeenCalledTimes(2);
      expect(retry.tx.accountCashState.findUnique).toHaveBeenCalledTimes(1);
      expect(retry.tx.cashEvent.create).toHaveBeenCalledTimes(1);
      expectPublished(harness);
    });

    it('stops a retry when the reread revision changed and requires an updated command', async () => {
      const harness = createHarness(makeState());
      const changed = createHarness(
        makeState({
          events: [
            storedEvent({
              date: '2026-10-02',
              id: 'other-deposit',
              sequence: 1,
              type: 'MOVEMENT',
              value: '400'
            })
          ],
          lastSequence: 1,
          revision: 1
        })
      );
      harness.prisma.$transaction
        .mockImplementationOnce(async (callback) => {
          await callback(harness.tx);
          throw prismaError('P2034');
        })
        .mockImplementation((callback) => callback(changed.tx));
      const event = {
        amount: '400',
        date: '2026-10-02',
        type: 'MOVEMENT' as const
      };

      await expect(
        harness.service.createEvent({ ...scope, event, expectedRevision: 0 })
      ).rejects.toBeInstanceOf(ConflictException);

      expect(harness.prisma.$transaction).toHaveBeenCalledTimes(2);
      expectNoWrites(changed);
      expect(harness.emit).not.toHaveBeenCalled();

      const result = await harness.service.createEvent({
        ...scope,
        event,
        expectedRevision: 1
      });

      expect(result.balances).toEqual([
        { date: '2026-10-01', value: '0' },
        { date: '2026-10-02', value: '800' }
      ]);
      expect(result.revision).toBe(2);
      expect(harness.prisma.$transaction).toHaveBeenCalledTimes(3);
      expectPublished(harness);
    });

    it('limits repeated P2034 conflicts to three transaction attempts', async () => {
      const harness = createHarness(reconciledState());
      harness.prisma.$transaction.mockRejectedValue(prismaError('P2034'));

      await expect(invoke(harness, 'create')).rejects.toThrow();

      expect(harness.prisma.$transaction).toHaveBeenCalledTimes(3);
      expect(harness.emit).not.toHaveBeenCalled();
    });

    it.each(['P2002', 'P2025'])(
      'does not retry a different Prisma failure %s',
      async (code) => {
        const harness = createHarness(reconciledState());
        harness.prisma.$transaction.mockRejectedValue(prismaError(code));

        await expect(invoke(harness, 'create')).rejects.toThrow();

        expect(harness.prisma.$transaction).toHaveBeenCalledTimes(1);
        expect(harness.emit).not.toHaveBeenCalled();
      }
    );

    it('keeps a committed operation successful if its notification throws a retryable-looking error', async () => {
      const harness = createHarness(reconciledState());
      jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
      jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
      harness.emit.mockImplementation(() => {
        throw prismaError('P2034');
      });

      const result = await invoke(harness, 'create');

      expect(result.revision).toBe(4);
      expect(harness.getState().revision).toBe(4);
      expect(harness.prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(harness.tx.cashEvent.create).toHaveBeenCalledTimes(1);
      expect(harness.emit).toHaveBeenCalledTimes(1);
    });
  });
});

function createHarness(initialState: StoredState | null) {
  let state = copyState(initialState);
  let eventNumber = 0;
  const emit = jest.fn();
  const tx = {
    $queryRaw: jest
      .fn()
      .mockResolvedValue([{ currency: 'EUR', id: scope.accountId }]),
    accountBalance: {
      findMany: jest.fn().mockResolvedValue([]),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      findFirst: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockImplementation(({ create, update }) => {
        return Promise.resolve({
          ...create,
          ...update,
          id: `balance-${create.date.toISOString()}`
        });
      })
    },
    accountCashState: {
      create: jest.fn().mockImplementation(({ data }) => {
        state = makeState({
          ...data,
          events: [],
          openingBalance: new Prisma.Decimal(data.openingBalance)
        });
        return Promise.resolve(copyState(state));
      }),
      findUnique: jest.fn().mockImplementation(() => {
        return Promise.resolve(copyState(state));
      }),
      update: jest.fn().mockImplementation(({ data }) => {
        const { lastSequence, revision, ...fields } = data;
        state = {
          ...state,
          ...fields,
          lastSequence: updateCounter(state.lastSequence, lastSequence),
          revision: updateCounter(state.revision, revision)
        };
        return Promise.resolve(copyState(state));
      })
    },
    cashEvent: {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        return Promise.resolve(
          state?.events.find(({ orderId }) => orderId === where.orderId) ?? null
        );
      }),
      upsert: jest.fn().mockImplementation(({ create, update, where }) => {
        const existing = state.events.find(({ id }) => id === where.id);
        const event = {
          ...(existing ?? {}),
          ...(existing ? update : create),
          id: where.id,
          value: new Prisma.Decimal((existing ? update : create).value),
          fee: new Prisma.Decimal((existing ? update : create).fee ?? 0)
        };
        state.events = state.events.filter(({ id }) => id !== where.id);
        state.events.push(event);
        return Promise.resolve({ ...event });
      }),
      create: jest.fn().mockImplementation(({ data }) => {
        const event = {
          ...storedEvent({
            date: openingDate,
            id: data.id ?? `created-event-${++eventNumber}`,
            sequence: data.sequence,
            type: data.type,
            value: '0'
          }),
          ...data,
          value: new Prisma.Decimal(data.value)
        };
        state.events = [...state.events, event];
        return Promise.resolve({ ...event });
      }),
      delete: jest.fn().mockImplementation(({ where }) => {
        const event = state.events.find(({ id }) => id === where.id);
        state.events = state.events.filter(({ id }) => id !== where.id);
        return Promise.resolve({ ...event });
      }),
      update: jest.fn().mockImplementation(({ data, where }) => {
        const previous = state.events.find(({ id }) => id === where.id);
        const event = {
          ...previous,
          ...data,
          value: new Prisma.Decimal(data.value ?? previous.value)
        };
        state.events = state.events.map((stored) => {
          return stored.id === where.id ? event : stored;
        });
        return Promise.resolve({ ...event });
      })
    }
  };
  const prisma = {
    $queryRaw: jest.fn(),
    $transaction: jest.fn().mockImplementation((callback) => callback(tx)),
    accountBalance: {
      deleteMany: jest.fn(),
      findFirst: jest.fn(),
      upsert: jest.fn()
    },
    accountCashState: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn()
    },
    cashEvent: {
      create: jest.fn(),
      delete: jest.fn(),
      update: jest.fn()
    }
  };

  // These mocks expose transaction boundaries and supplied write data. They do
  // not implement PostgreSQL rollback, row locking, or transaction isolation.
  return {
    emit,
    getState: () => copyState(state),
    prisma,
    service: new CashManagementService(
      { emit } as unknown as EventEmitter2,
      prisma as unknown as PrismaService
    ),
    tx
  };
}

function copyState(state: StoredState | null): StoredState | null {
  return state
    ? { ...state, events: state.events.map((event) => ({ ...event })) }
    : null;
}

function makeState(overrides: Partial<StoredState> = {}): StoredState {
  return {
    ...scope,
    currency: 'EUR',
    events: [],
    lastSequence: 0,
    openingBalance: new Prisma.Decimal('0'),
    openingDate: utcDate(openingDate),
    revision: 0,
    ...overrides
  };
}

function reconciledState(overrides: Partial<StoredState> = {}): StoredState {
  return makeState({
    events: [
      storedEvent({
        date: '2026-10-02',
        id: 'deposit',
        sequence: 1,
        type: 'MOVEMENT',
        value: '40'
      }),
      storedEvent({
        date: '2026-10-04',
        id: 'reconciliation',
        sequence: 2,
        type: 'CHECKPOINT',
        value: '500'
      }),
      storedEvent({
        date: '2026-10-06',
        id: 'withdrawal',
        sequence: 3,
        type: 'MOVEMENT',
        value: '-60'
      })
    ],
    lastSequence: 3,
    openingBalance: new Prisma.Decimal('100'),
    revision: 3,
    ...overrides
  });
}

function storedEvent({
  date,
  value,
  ...fields
}: {
  date: string;
  id: string;
  sequence: number;
  type: StoredEvent['type'];
  value: string;
}): StoredEvent {
  return {
    ...scope,
    comment: null,
    createdAt: utcDate('2026-10-20'),
    date: utcDate(date),
    updatedAt: utcDate('2026-10-20'),
    value: new Prisma.Decimal(value),
    ...fields
  };
}

function invoke(
  harness: ReturnType<typeof createHarness>,
  operation: Operation,
  expectedRevision = 3
) {
  switch (operation) {
    case 'open':
      return harness.service.open({
        ...scope,
        balance: '500',
        date: openingDate
      });
    case 'get':
      return harness.service.get(scope);
    case 'create':
      return harness.service.createEvent({
        ...scope,
        event: { amount: '25', date: '2026-10-03', type: 'MOVEMENT' },
        expectedRevision
      });
    case 'update':
      return harness.service.updateEvent({
        ...scope,
        event: { amount: '10', date: '2026-10-02', type: 'MOVEMENT' },
        eventId: 'deposit',
        expectedRevision
      });
    case 'delete':
      return harness.service.deleteEvent({
        ...scope,
        eventId: 'deposit',
        expectedRevision
      });
  }
}

function writeAmount(
  harness: ReturnType<typeof createHarness>,
  operation: AmountOperation,
  value: string
) {
  if (operation === 'opening') {
    return harness.service.open({
      ...scope,
      balance: value,
      date: openingDate
    });
  }

  if (operation === 'movement update' || operation === 'checkpoint update') {
    return harness.service.updateEvent({
      ...scope,
      event:
        operation === 'movement update'
          ? { amount: value, date: '2026-10-02', type: 'MOVEMENT' }
          : { balance: value, date: '2026-10-04', type: 'CHECKPOINT' },
      eventId: operation === 'movement update' ? 'deposit' : 'reconciliation',
      expectedRevision: 3
    });
  }

  return harness.service.createEvent({
    ...scope,
    event:
      operation === 'movement'
        ? { amount: value, date: '2026-10-03', type: 'MOVEMENT' }
        : { balance: value, date: '2026-10-03', type: 'CHECKPOINT' },
    expectedRevision: 3
  });
}

function expectLockedAccount(harness: ReturnType<typeof createHarness>) {
  expect(harness.tx.$queryRaw).toHaveBeenCalledTimes(1);
  const [strings, ...parameters] = harness.tx.$queryRaw.mock.calls[0];
  expect(Array.isArray(strings)).toBe(true);
  expect(strings.raw).toBeDefined();
  expect(strings.join('?')).toMatch(/FOR\s+UPDATE/i);
  expect(strings.join('?')).toMatch(/"id"\s*=\s*\?/);
  expect(strings.join('?')).toMatch(/"userId"\s*=\s*\?/);
  expect(parameters).toEqual([scope.accountId, scope.userId]);
}

function expectScopedStateRead(harness: ReturnType<typeof createHarness>) {
  expect(harness.tx.accountCashState.findUnique).toHaveBeenCalledWith(
    expect.objectContaining({
      where: { accountId_userId: scope }
    })
  );
}

function expectProjection(
  harness: ReturnType<typeof createHarness>,
  balances: { date: string; value: string }[],
  date = openingDate
) {
  expect(harness.tx.accountBalance.upsert).toHaveBeenCalledTimes(
    balances.length
  );

  for (const balance of balances) {
    expect(harness.tx.accountBalance.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          ...scope,
          date: utcDate(balance.date),
          isCashManagementProjection: true,
          value: Number(balance.value)
        }),
        update: expect.objectContaining({
          isCashManagementProjection: true,
          value: Number(balance.value)
        }),
        where: {
          accountId_userId_date: {
            accountId: scope.accountId,
            userId: scope.userId,
            date: utcDate(balance.date)
          }
        }
      })
    );
  }

  for (const [{ update }] of harness.tx.accountBalance.upsert.mock.calls) {
    expect(update).not.toHaveProperty('id');
  }

  expect(harness.tx.accountBalance.deleteMany).toHaveBeenCalledTimes(1);
  expect(harness.tx.accountBalance.deleteMany).toHaveBeenCalledWith({
    where: {
      ...scope,
      date: {
        gte: utcDate(date),
        notIn: balances.map(({ date: balanceDate }) => utcDate(balanceDate))
      },
      isCashManagementProjection: true
    }
  });
}

function expectPublished(harness: ReturnType<typeof createHarness>) {
  expect(harness.emit).toHaveBeenCalledTimes(1);
  expect(harness.emit.mock.calls[0][0]).toBe(PortfolioChangedEvent.getName());
  expect(harness.emit.mock.calls[0][1].getUserId()).toBe(scope.userId);
}

function expectExactDecimal(actual: string, expected: string) {
  expect(typeof actual).toBe('string');
  expect(new Prisma.Decimal(actual).toFixed()).toBe(expected);
}

function expectNoWrites(harness: ReturnType<typeof createHarness>) {
  for (const write of [
    harness.tx.accountCashState.create,
    harness.tx.accountCashState.update,
    harness.tx.cashEvent.create,
    harness.tx.cashEvent.update,
    harness.tx.cashEvent.delete,
    harness.tx.accountBalance.upsert,
    harness.tx.accountBalance.deleteMany
  ]) {
    expect(write).not.toHaveBeenCalled();
  }

  expectRootClientUnused(harness);
}

function expectRootClientUnused(harness: ReturnType<typeof createHarness>) {
  expect(harness.prisma.$queryRaw).not.toHaveBeenCalled();

  for (const model of [
    harness.prisma.accountCashState,
    harness.prisma.cashEvent,
    harness.prisma.accountBalance
  ]) {
    for (const query of Object.values(model)) {
      expect(query).not.toHaveBeenCalled();
    }
  }
}

function updateCounter(
  previous: number,
  update: number | { increment: number } | undefined
) {
  if (typeof update === 'number') {
    return update;
  }

  return previous + (update?.increment ?? 0);
}

function prismaError(code: string) {
  return new Prisma.PrismaClientKnownRequestError(`Test failure ${code}`, {
    clientVersion: 'test',
    code
  });
}

function deferred() {
  let resolve: () => void;
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve: () => resolve() };
}

function utcDate(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}
