import { ActivitiesService } from '@ghostfolio/api/app/activities/activities.service';
import { UserService } from '@ghostfolio/api/app/user/user.service';
import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import {
  CashCsvPreview,
  CashManagementExport
} from '@ghostfolio/common/interfaces';

import { ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { format, parseISO } from 'date-fns';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { AccountBalanceService } from './account-balance.service';
import { CashManagementService } from './cash-management.service';

const databaseUrl = process.env.CASH_TEST_DATABASE_URL;
const describeDatabase = databaseUrl ? describe : describe.skip;

/** Opt-in tests against a migrated disposable database; never clear shared tables. */
describeDatabase('Cash management with PostgreSQL', () => {
  let prisma: PrismaService;
  let service: CashManagementService;
  let accountId: string;
  let userId: string;
  const users: string[] = [];
  const exchangeRate = {
    toCurrencyAtDate: jest.fn(),
    toCurrency: (value: number) => value
  };
  const emitter = new EventEmitter2();
  const day = (date: string) => new Date(`${date}T00:00:00.000Z`);
  const scope = () => ({ accountId, userId });

  beforeAll(async () => {
    const url = new URL(databaseUrl);
    if (!url.pathname.startsWith('/cash_test')) {
      throw new Error(
        'CASH_TEST_DATABASE_URL must name a disposable cash_test database'
      );
    }
    prisma = new PrismaService(
      new ConfigService({ DATABASE_URL: databaseUrl, LOG_LEVELS: '[]' })
    );
    await prisma.$connect();
    service = new CashManagementService(emitter, prisma, exchangeRate as never);
  });

  beforeEach(async () => {
    userId = randomUUID();
    users.push(userId);
    await prisma.user.create({ data: { id: userId } });
    accountId = (
      await prisma.account.create({
        data: { currency: 'EUR', name: 'Cash integration test', userId }
      })
    ).id;
    exchangeRate.toCurrencyAtDate
      .mockReset()
      .mockImplementation((value) => value);
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.cashEvent.deleteMany({
        where: { userId: { in: users } }
      });
      await prisma.user.deleteMany({ where: { id: { in: users } } });
      await prisma.$disconnect();
    }
  });

  it('requires explicit negative-balance confirmation without saving rejected changes', async () => {
    const initial = await service.open({
      ...scope(),
      date: '2026-10-01',
      balance: '100'
    });
    const request = {
      ...scope(),
      expectedRevision: initial.revision,
      event: { type: 'MOVEMENT' as const, date: '2026-10-02', amount: '-125' }
    };
    await expect(service.createEvent(request)).rejects.toMatchObject({
      response: {
        code: 'CASH_CONFIRMATION_REQUIRED',
        negativeBalanceDate: '2026-10-02'
      }
    });
    expect((await service.get(scope())).events).toHaveLength(0);
    const result = await service.createEvent({
      ...request,
      confirmNegativeBalance: true
    });
    expect(result.minimumBalance.value).toBe('-25');
    expect(result.events).toHaveLength(1);
  });

  async function open(balance = '100') {
    return service.open({ ...scope(), date: '2026-10-01', balance });
  }

  async function orderEffect(
    amount = 10,
    currency = 'EUR',
    date = day('2026-10-02')
  ) {
    return service.runInAccounts(
      { accountIds: [accountId], userId },
      async (transaction) => {
        const order = await transaction.order.create({
          data: {
            account: { connect: { id_userId: { id: accountId, userId } } },
            user: { connect: { id: userId } },
            date,
            type: 'BUY',
            quantity: 1,
            unitPrice: amount,
            fee: 0,
            currency,
            SymbolProfile: {
              create: {
                currency,
                symbol: randomUUID(),
                dataSource: 'MANUAL',
                userId
              }
            }
          },
          include: { SymbolProfile: true }
        });
        await service.synchronizeOrder(transaction, order, { enabled: true });
        return order;
      }
    );
  }

  function activityService() {
    return new ActivitiesService(
      null,
      null,
      null,
      { getBenchmarkAssetProfiles: jest.fn().mockResolvedValue([]) } as never,
      { addJobToQueue: jest.fn(), gatherSymbols: jest.fn() } as never,
      null,
      emitter,
      exchangeRate as never,
      { deleteMany: jest.fn() } as never,
      prisma,
      {
        getSymbolProfilesByIds: async (ids: string[]) =>
          (
            await prisma.symbolProfile.findMany({ where: { id: { in: ids } } })
          ).map((profile) => ({
            ...profile,
            activitiesCount: 100,
            watchedByCount: 0
          }))
      } as never,
      { validateTagIds: jest.fn() } as never,
      service
    );
  }

  function activityInput(unitPrice = 10, date = '2026-10-02') {
    const symbol = randomUUID();
    return {
      userId,
      user: { connect: { id: userId } },
      accountId,
      date: day(date),
      type: 'BUY' as const,
      currency: 'EUR',
      fee: 0,
      quantity: 1,
      unitPrice,
      symbol,
      SymbolProfile: {
        connectOrCreate: {
          where: {
            dataSource_symbol: { dataSource: 'MANUAL' as const, symbol }
          },
          create: { dataSource: 'MANUAL' as const, symbol, currency: 'EUR' }
        }
      }
    };
  }

  it('uses the account default, honors an explicit override, and leaves old history unmanaged', async () => {
    await open('1000');
    await service.updatePreferences({
      ...scope(),
      expectedRevision: 0,
      defaultUpdateCash: true
    });
    const activities = activityService();
    await activities.createActivity(activityInput(10));
    await activities.createActivity({
      ...activityInput(20),
      updateAccountBalance: false
    });
    await activities.createActivity(activityInput(30, '2026-09-01'));
    expect(await prisma.order.count({ where: { userId } })).toBe(3);
    expect((await service.get(scope())).events).toHaveLength(1);
    expect((await service.get(scope())).balances.at(-1).value).toBe('990');
  });

  it('edits, moves and deletes a tracked activity through the real activity service', async () => {
    await open();
    const destination = await prisma.account.create({
      data: { userId, name: 'Destination', currency: 'EUR' }
    });
    await service.open({
      accountId: destination.id,
      userId,
      date: '2026-10-01',
      balance: '1000'
    });
    const activities = activityService();
    const order = await activities.createActivity({
      ...activityInput(),
      updateAccountBalance: true
    });
    const moved = await activities.updateActivity({
      userId,
      originalDate: order.date,
      where: { id: order.id },
      data: {
        date: order.date,
        type: order.type,
        unitPrice: 20,
        quantity: 1,
        fee: 0,
        currency: 'EUR',
        account: { connect: { id_userId: { id: destination.id, userId } } },
        SymbolProfile: {
          connect: {
            dataSource_symbol: {
              dataSource: 'MANUAL',
              symbol: order.SymbolProfile.symbol
            }
          },
          update: {}
        }
      }
    });
    expect((await service.get(scope())).balances.at(-1).value).toBe('100');
    expect(
      (await service.get({ accountId: destination.id, userId })).balances.at(-1)
        .value
    ).toBe('980');
    await activities.deleteActivity({ id: moved.id, userId });
    expect(
      (await service.get({ accountId: destination.id, userId })).balances.at(-1)
        .value
    ).toBe('1000');
  });

  it('revalidates a confirmed overdraft after another writer changes the history', async () => {
    await open();
    const activities = activityService();
    await expect(
      activities.createActivity({
        ...activityInput(250),
        updateAccountBalance: true
      })
    ).rejects.toMatchObject({
      response: { code: 'CASH_CONFIRMATION_REQUIRED', revision: 0 }
    });
    await service.createEvent({
      ...scope(),
      expectedRevision: 0,
      event: { type: 'MOVEMENT', amount: '100', date: '2026-10-02' }
    });
    await expect(
      activities.createActivity({
        ...activityInput(250),
        updateAccountBalance: true,
        confirmNegativeBalance: true,
        cashRevisions: { [accountId]: 0 }
      })
    ).rejects.toMatchObject({
      response: { code: 'CASH_CONFIRMATION_REQUIRED', revision: 1 }
    });
    expect(await prisma.order.count({ where: { userId } })).toBe(0);
    await activities.createActivity({
      ...activityInput(250),
      updateAccountBalance: true,
      confirmNegativeBalance: true,
      cashRevisions: { [accountId]: 1 }
    });
    expect((await service.get(scope())).balances.at(-1).value).toBe('-50');
  });

  it('serializes competing openings and competing revisions without losing an event', async () => {
    const openings = await Promise.allSettled([open(), open()]);
    expect(
      openings.filter(({ status }) => status === 'fulfilled')
    ).toHaveLength(1);
    const command = {
      ...scope(),
      expectedRevision: 0,
      event: { type: 'MOVEMENT' as const, amount: '40', date: '2026-10-02' }
    };
    const writes = await Promise.allSettled([
      service.createEvent(command),
      service.createEvent(command)
    ]);
    expect(writes.filter(({ status }) => status === 'fulfilled')).toHaveLength(
      1
    );
    expect(writes.find(({ status }) => status === 'rejected')).toMatchObject({
      reason: expect.any(ConflictException)
    });
    const next = await service.createEvent({ ...command, expectedRevision: 1 });
    expect(next.events).toHaveLength(2);
    expect(next.balances.at(-1).value).toBe('180');
  });

  it('adopts the opening row and preserves earlier legacy history', async () => {
    await prisma.accountBalance.create({
      data: { ...scope(), date: day('2026-09-01'), value: 80 }
    });
    const original = await prisma.accountBalance.create({
      data: { ...scope(), date: day('2026-10-01'), value: 90 }
    });
    await open();
    expect(
      await prisma.accountBalance.findUnique({ where: { id: original.id } })
    ).toMatchObject({ value: 100, isCashManagementProjection: true });
    expect(await prisma.accountBalance.count({ where: scope() })).toBe(2);
  });

  it('leaves no changes after rejecting an overdraft and commits only after confirmation', async () => {
    await open('50');
    const command = {
      ...scope(),
      expectedRevision: 0,
      event: { type: 'MOVEMENT' as const, amount: '-100', date: '2026-10-02' }
    };
    await expect(service.createEvent(command)).rejects.toMatchObject({
      response: { code: 'CASH_CONFIRMATION_REQUIRED', revision: 0 }
    });
    expect(await prisma.cashEvent.count({ where: scope() })).toBe(0);
    expect((await service.get(scope())).revision).toBe(0);
    const result = await service.createEvent({
      ...command,
      confirmNegativeBalance: true
    });
    expect(result.minimumBalance.value).toBe('-50');
  });

  it('propagates retroactive changes up to an absolute reconciliation', async () => {
    await open();
    await service.createEvent({
      ...scope(),
      expectedRevision: 0,
      event: { date: '2026-10-04', type: 'CHECKPOINT', balance: '500' }
    });
    const deposit = await service.createEvent({
      ...scope(),
      expectedRevision: 1,
      event: { date: '2026-10-02', type: 'MOVEMENT', amount: '40' }
    });
    expect(deposit.balances.map(({ value }) => value)).toEqual([
      '100',
      '140',
      '500'
    ]);
    const event = deposit.events.find(({ type }) => type === 'MOVEMENT');
    const removed = await service.deleteEvent({
      ...scope(),
      expectedRevision: 2,
      eventId: event.id
    });
    expect(removed.balances.map(({ value }) => value)).toEqual(['100', '500']);
    expect(
      await prisma.accountBalance.count({
        where: { ...scope(), date: day('2026-10-02') }
      })
    ).toBe(0);
  });

  it('prevents legacy writers from overwriting managed projections', async () => {
    await open();
    const balances = new AccountBalanceService(
      emitter,
      exchangeRate as never,
      prisma,
      service
    );
    await expect(
      balances.createOrUpdateAccountBalance({
        ...scope(),
        date: '2026-10-01',
        balance: 999
      })
    ).rejects.toBeInstanceOf(ConflictException);
    const row = await prisma.accountBalance.findFirst({ where: scope() });
    await expect(
      balances.deleteAccountBalance({ id: row.id, userId })
    ).rejects.toBeInstanceOf(ConflictException);
    expect((await service.get(scope())).balances[0].value).toBe('100');
  });

  it('persists the exact converted amount and reverses it without obtaining a new FX rate', async () => {
    await open('1000');
    exchangeRate.toCurrencyAtDate.mockResolvedValue(-110.12);
    const order = await orderEffect(100, 'USD');
    expect((await service.get(scope())).balances.at(-1).value).toBe('889.88');
    exchangeRate.toCurrencyAtDate.mockResolvedValue(-999);
    await service.runInAccounts(
      { accountIds: [accountId], userId },
      async (transaction) => {
        const updated = await transaction.order.update({
          where: { id: order.id },
          data: { comment: 'New note' },
          include: { SymbolProfile: true }
        });
        await service.synchronizeOrder(transaction, updated, {
          original: order
        });
      }
    );
    expect(exchangeRate.toCurrencyAtDate).toHaveBeenCalledTimes(1);
    await service.runInAccounts(
      { accountIds: [accountId], userId },
      async (transaction) => {
        await service.removeOrderEffects(transaction, [order]);
        await transaction.order.delete({ where: { id: order.id } });
      }
    );
    expect((await service.get(scope())).balances.at(-1).value).toBe('1000');
  });

  it('persists order-linked cash and projections on the order civil date', async () => {
    await service.open({ ...scope(), date: '2026-01-01', balance: '5000' });
    const profile = await prisma.symbolProfile.create({
      data: {
        currency: 'EUR',
        dataSource: 'MANUAL',
        symbol: randomUUID(),
        userId
      }
    });
    const cases = [
      {
        date: '2026-02-02',
        type: 'BUY',
        quantity: 500,
        unitPrice: 5.98,
        fee: 1.5
      },
      {
        date: '2026-04-21',
        type: 'DIVIDEND',
        quantity: 500,
        unitPrice: 0.72,
        fee: 0
      },
      {
        date: '2026-09-01',
        type: 'SELL',
        quantity: 500,
        unitPrice: 6.668,
        fee: 1
      }
    ] as const;

    for (const item of cases) {
      await service.runInAccounts(
        { accountIds: [accountId], userId },
        async (transaction) => {
          const order = await transaction.order.create({
            data: {
              account: { connect: { id_userId: { id: accountId, userId } } },
              user: { connect: { id: userId } },
              SymbolProfile: { connect: { id: profile.id } },
              date: parseISO(item.date),
              type: item.type,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              fee: item.fee,
              currency: 'EUR'
            },
            include: { SymbolProfile: true }
          });
          expect(format(order.date, 'yyyy-MM-dd')).toBe(item.date);
          await service.synchronizeOrder(transaction, order, { enabled: true });
        }
      );
    }

    const stored = await prisma.cashEvent.findMany({
      where: scope(),
      orderBy: { date: 'asc' }
    });
    expect(stored.map(({ date }) => date.toISOString().slice(0, 10))).toEqual(
      cases.map(({ date }) => date)
    );
    expect(stored.map(({ value }) => value.toString())).toEqual([
      '-2991.5',
      '360',
      '3333'
    ]);

    const projected = await prisma.accountBalance.findMany({
      where: { ...scope(), isCashManagementProjection: true },
      orderBy: { date: 'asc' }
    });
    expect(
      projected.map(({ date, value }) => [
        date.toISOString().slice(0, 10),
        value
      ])
    ).toEqual([
      ['2026-01-01', 5000],
      ['2026-02-02', 2008.5],
      ['2026-04-21', 2368.5],
      ['2026-09-01', 5701.5]
    ]);
  });

  it('rolls back both the order and the event when the projection fails', async () => {
    await open();
    const countBefore = await prisma.order.count({ where: { userId } });
    const projection = jest
      .spyOn(service as never, 'writeProjection' as never)
      .mockRejectedValueOnce(new Error('Projection failure') as never);
    await expect(orderEffect()).rejects.toThrow('Projection failure');
    projection.mockRestore();
    expect(await prisma.order.count({ where: { userId } })).toBe(countBefore);
    expect(await prisma.cashEvent.count({ where: scope() })).toBe(0);
    expect((await service.get(scope())).revision).toBe(0);
  });

  it('keeps a rejected activity creation out of the database through the real activity service', async () => {
    await open('5');
    const activities = new ActivitiesService(
      null,
      null,
      null,
      null,
      { addJobToQueue: jest.fn() } as never,
      null,
      emitter,
      exchangeRate as never,
      null,
      prisma,
      null,
      { validateTagIds: jest.fn() } as never,
      service
    );
    await expect(
      activities.createActivity({
        userId,
        user: { connect: { id: userId } },
        accountId,
        date: day('2026-10-02'),
        type: 'BUY',
        currency: 'EUR',
        fee: 0,
        quantity: 1,
        unitPrice: 10,
        symbol: 'Test',
        updateAccountBalance: true,
        SymbolProfile: {
          connectOrCreate: {
            where: {
              dataSource_symbol: { dataSource: 'MANUAL', symbol: randomUUID() }
            },
            create: {
              dataSource: 'MANUAL',
              symbol: randomUUID(),
              currency: 'EUR'
            }
          }
        }
      })
    ).rejects.toMatchObject({
      response: { code: 'CASH_CONFIRMATION_REQUIRED' }
    });
    expect(await prisma.order.count({ where: { userId } })).toBe(0);
  });

  it('updates preferences without touching the balances', async () => {
    await open();
    const before = await prisma.accountBalance.findMany({ where: scope() });
    await service.updatePreferences({
      ...scope(),
      expectedRevision: 0,
      defaultUpdateCash: true
    });
    expect(await prisma.accountBalance.findMany({ where: scope() })).toEqual(
      before
    );
    expect((await service.get(scope())).defaultUpdateCash).toBe(true);
  });

  const freezeClock = (instant: string) => {
    // Keep PostgreSQL I/O and timeout timers real; freeze only the wall clock.
    jest.useFakeTimers({
      doNotFake: [
        'hrtime',
        'nextTick',
        'performance',
        'queueMicrotask',
        'setImmediate',
        'clearImmediate',
        'setInterval',
        'clearInterval',
        'setTimeout',
        'clearTimeout'
      ]
    });
    jest.setSystemTime(new Date(instant));
  };

  describe.each([false, true])(
    'transfer civil dates (managed destination: %s)',
    (managed) => {
      it.each([
        {
          instant: '2026-10-23T22:30:00.000Z',
          utcDay: '2026-10-23',
          romeDay: '2026-10-24'
        },
        {
          instant: '2026-10-25T23:30:00.000Z',
          utcDay: '2026-10-25',
          romeDay: '2026-10-26'
        }
      ])(
        'uses the instance civil date at $instant',
        async ({ instant, utcDay, romeDay }) => {
          await open();
          const to = await prisma.account.create({
            data: {
              userId,
              currency: 'EUR',
              name: 'Transfer civil date destination'
            }
          });
          if (managed)
            await service.open({
              accountId: to.id,
              userId,
              date: '2026-10-01',
              balance: '0'
            });
          freezeClock(instant);
          try {
            await service.transfer({
              accountIdFrom: accountId,
              accountIdTo: to.id,
              balance: 25,
              userId
            });
            const expected =
              process.env.TEST_TZ === 'Europe/Rome' ? romeDay : utcDay;
            expect((await service.get(scope())).events.at(-1).date).toBe(
              expected
            );
            const credit = await prisma.accountBalance.findFirst({
              where: { accountId: to.id, userId },
              orderBy: { date: 'desc' }
            });
            expect(credit.date.toISOString().slice(0, 10)).toBe(expected);
            expect(credit.value).toBe(25);
            if (managed)
              expect(
                (await service.get({ accountId: to.id, userId })).events.at(-1)
                  .date
              ).toBe(expected);
          } finally {
            jest.useRealTimers();
          }
        }
      );
    }
  );

  it('uses the balance at a backdated legacy activity and preserves later absolute snapshots', async () => {
    await prisma.accountBalance.createMany({
      data: [
        { ...scope(), date: day('2026-10-01'), value: 100 },
        { ...scope(), date: day('2026-10-20'), value: 200 }
      ]
    });
    const other = await prisma.account.create({
      data: { currency: 'EUR', name: 'Unrelated legacy account', userId }
    });
    await prisma.accountBalance.create({
      data: { accountId: other.id, userId, date: day('2026-10-02'), value: 999 }
    });
    await orderEffect(10);
    const rows = await prisma.accountBalance.findMany({
      where: scope(),
      orderBy: { date: 'asc' }
    });
    expect(
      rows.map(({ date, value }) => [date.toISOString().slice(0, 10), value])
    ).toEqual([
      ['2026-10-01', 100],
      ['2026-10-02', 90],
      ['2026-10-20', 200]
    ]);
    expect(
      (
        await prisma.accountBalance.findFirst({
          where: { accountId: other.id, userId }
        })
      ).value
    ).toBe(999);
  });

  it('excludes the next civil day when a legacy activity has a time component', async () => {
    await prisma.accountBalance.createMany({
      data: [
        { ...scope(), date: day('2026-10-02'), value: 100 },
        { ...scope(), date: day('2026-10-03'), value: 200 }
      ]
    });
    await orderEffect(10, 'EUR', new Date('2026-10-02T12:00:00.000Z'));
    expect(
      (
        await prisma.accountBalance.findFirst({
          where: { ...scope(), date: day('2026-10-02') }
        })
      ).value
    ).toBe(90);
    expect(
      (
        await prisma.accountBalance.findFirst({
          where: { ...scope(), date: day('2026-10-03') }
        })
      ).value
    ).toBe(200);
  });

  it('uses the activity civil date for legacy writes near UTC midnight', async () => {
    await prisma.accountBalance.createMany({
      data: [
        { ...scope(), date: day('2026-10-23'), value: 50 },
        { ...scope(), date: day('2026-10-24'), value: 100 }
      ]
    });
    await orderEffect(10, 'EUR', new Date('2026-10-23T22:30:00.000Z'));
    const rows = await prisma.accountBalance.findMany({
      where: scope(),
      orderBy: { date: 'asc' }
    });
    expect(
      rows.map(({ date, value }) => [date.toISOString().slice(0, 10), value])
    ).toEqual(
      process.env.TEST_TZ === 'Europe/Rome'
        ? [
            ['2026-10-23', 50],
            ['2026-10-24', 90]
          ]
        : [
            ['2026-10-23', 40],
            ['2026-10-24', 100]
          ]
    );
  });

  it('preserves the existing legacy balance across a UTC day boundary', async () => {
    await open();
    const to = await prisma.account.create({
      data: { userId, currency: 'EUR', name: 'Legacy same-day balance' }
    });
    // The civil day is October 24 in Rome and October 23 in UTC. A later snapshot
    // must remain authoritative in UTC; a same-day snapshot must be augmented in Rome.
    await prisma.accountBalance.create({
      data: { accountId: to.id, userId, date: day('2026-10-24'), value: 100 }
    });
    freezeClock('2026-10-23T22:30:00.000Z');
    try {
      await service.transfer({
        accountIdFrom: accountId,
        accountIdTo: to.id,
        balance: 25,
        userId
      });
      const rows = await prisma.accountBalance.findMany({
        where: { accountId: to.id, userId },
        orderBy: { date: 'asc' }
      });
      expect(
        rows.map(({ date, value }) => [date.toISOString().slice(0, 10), value])
      ).toEqual(
        process.env.TEST_TZ === 'Europe/Rome'
          ? [['2026-10-24', 125]]
          : [
              ['2026-10-23', 25],
              ['2026-10-24', 100]
            ]
      );
    } finally {
      jest.useRealTimers();
    }
  });

  it('protects a referenced account but deletes all cash data with its user', async () => {
    await open();

    const legacy = await prisma.account.create({
      data: { userId, currency: 'EUR', name: 'Referenced legacy account' }
    });

    await service.transfer({
      accountIdFrom: accountId,
      accountIdTo: legacy.id,
      balance: 25,
      userId
    });

    const events = await prisma.cashEvent.findMany({
      where: { userId, transferId: { not: null } }
    });

    expect(events).toHaveLength(1);
    expect(events[0].transferCounterpartyAccountId).toBe(legacy.id);

    await expect(
      prisma.account.delete({
        where: { id_userId: { id: legacy.id, userId } }
      })
    ).rejects.toMatchObject({ code: 'P2003' });

    const userService = Object.assign(Object.create(UserService.prototype), {
      prismaService: prisma,
      activitiesService: {
        deleteActivities: jest.fn().mockResolvedValue(undefined)
      }
    }) as UserService;

    await userService.deleteUser({ id: userId });

    expect(await prisma.user.count({ where: { id: userId } })).toBe(0);
    expect(await prisma.account.count({ where: { userId } })).toBe(0);
    expect(await prisma.cashEvent.count({ where: { userId } })).toBe(0);
    expect(await prisma.accountCashState.count({ where: { userId } })).toBe(0);
    expect(await prisma.accountBalance.count({ where: { userId } })).toBe(0);
  });

  it('transfers between a managed and a legacy account in one transaction', async () => {
    await open();
    const to = await prisma.account.create({
      data: { userId, currency: 'EUR', name: 'Destination' }
    });
    await service.transfer({
      accountIdFrom: accountId,
      accountIdTo: to.id,
      balance: 25,
      userId
    });
    expect((await service.get(scope())).balances.at(-1).value).toBe('75');
    expect(
      (
        await prisma.accountBalance.findFirst({
          where: { accountId: to.id, userId }
        })
      ).value
    ).toBe(25);
  });

  it('rolls back the debit if the credit cannot rebuild a destination ledger', async () => {
    await open();
    const to = await prisma.account.create({
      data: { userId, currency: 'EUR', name: 'Destination' }
    });
    await service.open({
      accountId: to.id,
      userId,
      date: '2026-10-01',
      balance: '0'
    });
    await prisma.accountBalance.create({
      data: { accountId: to.id, userId, date: day('2026-10-10'), value: 123 }
    });
    await expect(
      service.transfer({
        accountIdFrom: accountId,
        accountIdTo: to.id,
        balance: 25,
        userId
      })
    ).rejects.toBeInstanceOf(ConflictException);
    expect((await service.get(scope())).balances.at(-1).value).toBe('100');
    expect(await prisma.cashEvent.count({ where: scope() })).toBe(0);
  });

  it('restores exact cash history with remapped activity ids and ignores a repeated restore', async () => {
    await open();
    const originalOrder = await orderEffect(10);
    const original = await service.get(scope());
    const target = await prisma.account.create({
      data: { userId, currency: 'EUR', name: 'Restored account' }
    });
    const restoredOrder = await prisma.order.create({
      data: {
        accountId: target.id,
        accountUserId: userId,
        userId,
        date: originalOrder.date,
        type: originalOrder.type,
        quantity: originalOrder.quantity,
        unitPrice: originalOrder.unitPrice,
        fee: 0,
        currency: 'EUR',
        symbolProfileId: originalOrder.symbolProfileId
      }
    });
    const snapshot: CashManagementExport = {
      version: 1,
      currency: original.currency,
      defaultUpdateCash: original.defaultUpdateCash,
      openingBalance: original.openingBalance,
      events: original.events
    };
    const restoreScope = { accountId: target.id, userId };
    const mapping = { [originalOrder.id]: restoredOrder.id };
    await service.restore(restoreScope, snapshot, mapping);
    await service.restore(restoreScope, snapshot, mapping);
    const result = await service.get(restoreScope);
    expect(result.balances).toEqual(original.balances);
    expect(result.events).toHaveLength(1);
    expect(result.events[0].orderId).toBe(restoredOrder.id);
  });
  it('starts at zero without a dated row and accepts the first backdated movement', async () => {
    const empty = await service.get(scope());
    expect(empty.events).toEqual([]);
    expect(empty.balances).toEqual([]);
    expect(await prisma.accountCashState.count({ where: scope() })).toBe(0);
    const first = await service.createEvent({
      ...scope(),
      expectedRevision: 0,
      event: { type: 'MOVEMENT', amount: '200', date: '2026-10-10' }
    });
    expect(first.balances).toEqual([{ date: '2026-10-10', value: '200' }]);
    const earlier = await service.createEvent({
      ...scope(),
      expectedRevision: first.revision,
      event: { type: 'MOVEMENT', amount: '100', date: '2026-10-01' }
    });
    expect(earlier.balances).toEqual([
      { date: '2026-10-01', value: '100' },
      { date: '2026-10-10', value: '300' }
    ]);
    expect(await prisma.accountBalance.count({ where: scope() })).toBe(2);
    const removed = await service.deleteEvent({
      ...scope(),
      expectedRevision: earlier.revision,
      eventId: first.events[0].id
    });
    expect(removed.balances.at(-1).value).toBe('100');
    const cleared = await service.deleteEvent({
      ...scope(),
      expectedRevision: removed.revision,
      eventId: removed.events[0].id
    });
    expect(cleared.balances).toEqual([]);
    expect(await prisma.accountBalance.count({ where: scope() })).toBe(0);
  });

  it('keeps reconciliations absolute after retroactive changes and permits changing operation type', async () => {
    let state = await service.createEvent({
      ...scope(),
      expectedRevision: 0,
      event: { type: 'MOVEMENT', amount: '1000', date: '2026-10-01' }
    });
    state = await service.createEvent({
      ...scope(),
      expectedRevision: state.revision,
      event: { type: 'MOVEMENT', amount: '-300', date: '2026-10-02' }
    });
    state = await service.createEvent({
      ...scope(),
      expectedRevision: state.revision,
      event: { type: 'CHECKPOINT', balance: '380', date: '2026-10-10' }
    });
    const checkpointId = state.events.at(-1).id;
    state = await service.createEvent({
      ...scope(),
      expectedRevision: state.revision,
      event: { type: 'MOVEMENT', amount: '50', date: '2026-10-11' }
    });
    state = await service.createEvent({
      ...scope(),
      expectedRevision: state.revision,
      event: { type: 'MOVEMENT', amount: '100', date: '2026-10-05' }
    });
    expect(state.balances.at(-1).value).toBe('430');
    state = await service.updateEvent({
      ...scope(),
      expectedRevision: state.revision,
      eventId: checkpointId,
      event: { type: 'MOVEMENT', amount: '380', date: '2026-10-10' }
    });
    expect(state.balances.at(-1).value).toBe('1230');
  });

  it('adopts legacy snapshots as editable reconciliations without replaying old activities', async () => {
    await prisma.accountBalance.createMany({
      data: [
        { ...scope(), date: day('2026-09-01'), value: 1000 },
        { ...scope(), date: day('2026-09-10'), value: 400 }
      ]
    });
    const preview = await service.get(scope());
    expect(preview.events.map((event) => event.type)).toEqual([
      'CHECKPOINT',
      'CHECKPOINT'
    ]);
    expect(await prisma.accountCashState.count({ where: scope() })).toBe(0);
    const result = await service.createEvent({
      ...scope(),
      expectedRevision: 0,
      event: { type: 'MOVEMENT', amount: '50', date: '2026-09-05' }
    });
    expect(result.balances).toEqual([
      { date: '2026-09-01', value: '1000' },
      { date: '2026-09-05', value: '1050' },
      { date: '2026-09-10', value: '400' }
    ]);
    expect(result.events.map((event) => event.id)).toEqual(
      expect.arrayContaining(preview.events.map((event) => event.id))
    );
  });

  it('changes visibility per account without changing cash history or investment defaults', async () => {
    let state = await service.updatePreferences({
      ...scope(),
      expectedRevision: 0,
      includeCashInPortfolio: false
    });
    expect(state.defaultUpdateCash).toBe(false);
    expect(state.balances).toEqual([]);
    expect(await prisma.accountBalance.count({ where: scope() })).toBe(0);
    state = await service.createEvent({
      ...scope(),
      expectedRevision: state.revision,
      event: { type: 'MOVEMENT', amount: '1000', date: '2026-10-01' }
    });
    const balances = new AccountBalanceService(
      emitter,
      exchangeRate as never,
      prisma,
      service
    );
    expect(
      await balances.getAccountBalanceItems({ userCurrency: 'EUR', userId })
    ).toEqual([]);
    expect(
      (await balances.getAccountBalances({ userCurrency: 'EUR', userId }))
        .balances
    ).toHaveLength(1);
    const visible = await service.updatePreferences({
      ...scope(),
      expectedRevision: state.revision,
      includeCashInPortfolio: true
    });
    expect(visible.events).toEqual(state.events);
    expect(visible.balances).toEqual(state.balances);
    expect(
      await balances.getAccountBalanceItems({ userCurrency: 'EUR', userId })
    ).toEqual([{ date: '2026-10-01', value: 1000 }]);
  });
  it('subtracts bank fees once while preserving gross amounts through edit, deletion and restore', async () => {
    let state = await service.createEvent({
      ...scope(),
      expectedRevision: 0,
      event: { type: 'MOVEMENT', amount: '1000', fee: '5', date: '2026-10-01' }
    });
    expect(state.events[0]).toMatchObject({ amount: '1000', fee: '5' });
    expect(state.balances.at(-1).value).toBe('995');
    state = await service.createEvent({
      ...scope(),
      expectedRevision: state.revision,
      event: { type: 'MOVEMENT', amount: '-300', fee: '3', date: '2026-10-02' }
    });
    expect(state.balances.at(-1).value).toBe('692');
    const withdrawalId = state.events.at(-1).id;
    state = await service.updateEvent({
      ...scope(),
      eventId: withdrawalId,
      expectedRevision: state.revision,
      event: { type: 'MOVEMENT', amount: '-300', fee: '7', date: '2026-10-02' }
    });
    expect(state.balances.at(-1).value).toBe('688');
    const target = await prisma.account.create({
      data: { userId, currency: 'EUR', name: 'Fee restore' }
    });
    await service.restore(
      { accountId: target.id, userId },
      { ...state, version: 1 },
      {}
    );
    const restored = await service.get({ accountId: target.id, userId });
    expect(restored.balances).toEqual(state.balances);
    expect(restored.events.map((e) => e.fee)).toEqual(['5', '7']);
    state = await service.deleteEvent({
      ...scope(),
      eventId: withdrawalId,
      expectedRevision: state.revision
    });
    expect(state.balances.at(-1).value).toBe('995');
    state = await service.createEvent({
      ...scope(),
      expectedRevision: state.revision,
      event: {
        type: 'CHECKPOINT',
        balance: '380',
        fee: '0',
        date: '2026-10-03'
      }
    });
    expect(state.balances.at(-1).value).toBe('380');
    expect(await prisma.cashEvent.count({ where: scope() })).toBe(2);
  });

  it('rejects negative fees and fees on reconciliation without creating any state', async () => {
    await expect(
      service.createEvent({
        ...scope(),
        expectedRevision: 0,
        event: {
          type: 'MOVEMENT',
          amount: '100',
          fee: '-1',
          date: '2026-10-01'
        }
      })
    ).rejects.toThrow();
    await expect(
      service.createEvent({
        ...scope(),
        expectedRevision: 0,
        event: {
          type: 'CHECKPOINT',
          balance: '100',
          fee: '1',
          date: '2026-10-01'
        }
      })
    ).rejects.toThrow();
    expect(await prisma.accountCashState.count({ where: scope() })).toBe(0);
    expect(await prisma.accountBalance.count({ where: scope() })).toBe(0);
  });
  describe('cash CSV import and export', () => {
    const csv = (lines: string[]) =>
      [
        'Date,Operation,Amount,Fee,Currency,Reference,Sequence,Note',
        ...lines
      ].join('\n');
    async function commit(text: string) {
      const preview = await service.previewCsv(scope(), text);
      expect(preview.errors).toEqual([]);
      return service.importCsv(scope(), {
        csv: text,
        digest: preview.digest,
        expectedRevision: preview.revision
      });
    }
    it('previews without writes, then imports all rows and fees exactly once', async () => {
      const text = csv([
        '2026-10-01,DEPOSIT,100,1,EUR,dep,1,bank',
        '2026-10-02,WITHDRAWAL,10,2,EUR,withdraw,2,cash'
      ]);
      const preview = await service.previewCsv(scope(), text);
      expect(preview.finalBalance).toBe('87');
      expect(await prisma.accountCashState.count({ where: scope() })).toBe(0);
      const state = await commit(text);
      expect(state.balances.at(-1).value).toBe('87');
      const exported = (await service.exportCsv(scope())).csv;
      const repeated = await service.previewCsv(scope(), exported);
      expect(repeated.newCount).toBe(0);
      expect(repeated.existingCount).toBe(2);
      const same = await commit(exported);
      expect(same.revision).toBe(state.revision);
      expect(await prisma.cashEvent.count({ where: scope() })).toBe(2);
    });
    it('rolls back a file with an invalid row instead of inserting its valid prefix', async () => {
      const text = csv([
        '2026-10-01,DEPOSIT,100,0,EUR,dep,1,',
        '2026-10-02,WITHDRAWAL,-10,0,EUR,bad,2,'
      ]);
      const preview = await service.previewCsv(scope(), text);
      expect(preview.errors.length).toBeGreaterThan(0);
      await expect(
        service.importCsv(scope(), {
          csv: text,
          digest: preview.digest,
          expectedRevision: 0
        })
      ).rejects.toThrow();
      expect(await prisma.cashEvent.count({ where: scope() })).toBe(0);
      expect(await prisma.accountCashState.count({ where: scope() })).toBe(0);
    });
    it('keeps reconciliation order and accepts a zero balance in the single Amount column', async () => {
      const state = await commit(
        csv([
          '2026-10-01,DEPOSIT,100,0,EUR,dep,1,',
          '2026-10-01,RECONCILIATION,0,0,EUR,rec,2,',
          '2026-10-01,DEPOSIT,20,0,EUR,dep2,3,'
        ])
      );
      expect(state.balances.at(-1).value).toBe('20');
      expect(state.events[1]).toMatchObject({
        type: 'CHECKPOINT',
        balance: '0'
      });
    });
    it('blocks stale previews and modified references without overwriting history', async () => {
      const text = csv(['2026-10-01,DEPOSIT,100,0,EUR,dep,1,']);
      const preview = await service.previewCsv(scope(), text);
      await service.createEvent({
        ...scope(),
        expectedRevision: 0,
        event: { date: '2026-10-02', type: 'MOVEMENT', amount: '50' }
      });
      await expect(
        service.importCsv(scope(), {
          csv: text,
          digest: preview.digest,
          expectedRevision: 0
        })
      ).rejects.toThrow(ConflictException);
      await commit(text);
      const conflict = await service.previewCsv(
        scope(),
        text.replace(',100,', ',200,')
      );
      expect(conflict.errors.join(' ')).toContain('different content');
      expect((await service.get(scope())).balances.at(-1).value).toBe('150');
    });
    it('blocks possible duplicates without references, currency mismatch, and partial transfers', async () => {
      await commit(csv(['2026-10-01,DEPOSIT,100,0,EUR,dep,1,']));
      expect(
        (
          await service.previewCsv(
            scope(),
            csv(['2026-10-01,DEPOSIT,100,0,EUR,,,'])
          )
        ).errors.join(' ')
      ).toContain('Possible duplicate');
      expect(
        (
          await service.previewCsv(
            scope(),
            csv(['2026-10-02,DEPOSIT,100,0,USD,new,2,'])
          )
        ).errors.join(' ')
      ).toContain('currency');
      expect(
        (
          await service.previewCsv(
            scope(),
            csv(['2026-10-02,TRANSFER,100,0,EUR,transfer,2,'])
          )
        ).errors.join(' ')
      ).toContain('Both account');
    });
    it('requires sequence where a reconciliation already exists on that day', async () => {
      await commit(csv(['2026-10-01,RECONCILIATION,100,0,EUR,rec,1,']));
      const preview = await service.previewCsv(
        scope(),
        csv(['2026-10-01,DEPOSIT,20,0,EUR,new,,'])
      );
      expect(preview.errors.join(' ')).toContain('Sequence');
    });
    it('restores a linked BUY into another account and keeps edit/delete synchronization', async () => {
      await open('1000');
      const original = await orderEffect(300);
      const text = (await service.exportCsv(scope())).csv;
      const destination = await prisma.account.create({
        data: { name: 'Restored', currency: 'EUR', userId }
      });
      accountId = destination.id;
      const copy = await prisma.order.create({
        data: {
          accountId,
          accountUserId: userId,
          userId,
          date: original.date,
          type: original.type,
          quantity: original.quantity,
          unitPrice: original.unitPrice,
          fee: original.fee,
          currency: original.currency,
          symbolProfileId: original.symbolProfileId
        }
      });
      const restored = await commit(text);
      expect(restored.balances.at(-1).value).toBe('700');
      expect(restored.events[0].orderId).toBe(copy.id);
      await service.runInAccounts(
        { accountIds: [accountId], userId },
        async (transaction) => {
          const updated = await transaction.order.update({
            where: { id: copy.id },
            data: { unitPrice: 250 },
            include: { SymbolProfile: true }
          });
          await service.synchronizeOrder(transaction, updated, {
            original: copy
          });
        }
      );
      expect((await service.get(scope())).balances.at(-1).value).toBe('750');
      await activityService().deleteActivity({ id: copy.id, userId });
      expect((await service.get(scope())).balances.at(-1).value).toBe('1000');
    });
    it('does not guess a missing or ambiguous financial activity', async () => {
      await open('1000');
      const order = await orderEffect(300);
      const text = (await service.exportCsv(scope())).csv;
      const destination = await prisma.account.create({
        data: { name: 'Ambiguous', currency: 'EUR', userId }
      });
      accountId = destination.id;
      expect(
        (await service.previewCsv(scope(), text)).errors.join(' ')
      ).toContain('not found');
      for (let i = 0; i < 2; i++)
        await prisma.order.create({
          data: {
            accountId,
            accountUserId: userId,
            userId,
            date: order.date,
            type: order.type,
            quantity: order.quantity,
            unitPrice: order.unitPrice,
            fee: order.fee,
            currency: order.currency,
            symbolProfileId: order.symbolProfileId
          }
        });
      expect(
        (await service.previewCsv(scope(), text)).errors.join(' ')
      ).toContain('Ambiguous');
      const ambiguous = await service.previewCsv(scope(), text);
      const row = ambiguous.rows.find((item) => item.candidates?.length);
      const activityLinks = { [row.line]: row.candidates[0].id };
      const resolved = await service.previewCsv(scope(), text, activityLinks);
      expect(resolved.errors).toEqual([]);
      const restored = await service.importCsv(scope(), {
        csv: text,
        digest: resolved.digest,
        expectedRevision: resolved.revision,
        activityLinks
      });
      expect(restored.events[0].orderId).toBe(row.candidates[0].id);
    });
    it('requires explicit confirmation before creating a negative cash balance', async () => {
      const text = csv(['2026-10-01,RECONCILIATION,-5,0,EUR,rec,1,']);
      const preview = await service.previewCsv(scope(), text);
      expect(preview.minimumBalance).toBe('-5');
      await expect(
        service.importCsv(scope(), {
          csv: text,
          digest: preview.digest,
          expectedRevision: 0
        })
      ).rejects.toThrow(ConflictException);
      expect(await prisma.cashEvent.count({ where: scope() })).toBe(0);
      await service.importCsv(scope(), {
        csv: text,
        digest: preview.digest,
        expectedRevision: 0,
        confirmNegativeBalance: true
      });
      expect((await service.get(scope())).balances.at(-1).value).toBe('-5');
    });
  });
  it('preserves tiny decimal amounts in a cash CSV without scientific notation', async () => {
    await service.createEvent({
      ...scope(),
      expectedRevision: 0,
      event: { date: '2026-10-01', type: 'MOVEMENT', amount: '0.0000000001' }
    });
    const csv = (await service.exportCsv(scope())).csv;
    expect(csv).toContain('0.0000000001');
    const preview = await service.previewCsv(scope(), csv);
    expect(preview.errors).toEqual([]);
    expect(preview.existingCount).toBe(1);
  });
  it('rolls back ledger rows and revision when projection fails during a CSV commit', async () => {
    await service.createEvent({
      ...scope(),
      expectedRevision: 0,
      event: { date: '2026-10-01', type: 'MOVEMENT', amount: '100' }
    });
    const csv =
      'Date,Operation,Amount,Currency,Reference\n2026-10-02,DEPOSIT,20,EUR,new';
    const preview = await service.previewCsv(scope(), csv);
    const projection = jest
      .spyOn(
        service as unknown as { writeProjection: () => Promise<void> },
        'writeProjection'
      )
      .mockRejectedValueOnce(new Error('Simulated projection failure'));
    try {
      await expect(
        service.importCsv(scope(), {
          csv,
          digest: preview.digest,
          expectedRevision: preview.revision
        })
      ).rejects.toThrow('Simulated projection failure');
    } finally {
      projection.mockRestore();
    }
    const state = await service.get(scope());
    expect(state.revision).toBe(preview.revision);
    expect(state.events).toHaveLength(1);
    expect(state.balances.at(-1).value).toBe('100');
  });

  it('cannot preview or export cash belonging to another user', async () => {
    await service.createEvent({
      ...scope(),
      expectedRevision: 0,
      event: { date: '2026-10-01', type: 'MOVEMENT', amount: '100' }
    });
    const stranger = randomUUID();
    await expect(
      service.exportCsv({ accountId, userId: stranger })
    ).rejects.toThrow('Account not found');
    await expect(
      service.previewCsv(
        { accountId, userId: stranger },
        'Date,Operation,Amount,Currency\n2026-10-02,DEPOSIT,1,EUR'
      )
    ).rejects.toThrow('Account not found');
  });
  describe('CSV account creation from Accounts', () => {
    const manualCsv =
      'Date,Operation,Amount,Fee,Currency,Reference,SourceAccount,SourceAccountName\n2026-10-01,DEPOSIT,1000,0,EUR,deposit,source,Fineco\n2026-10-02,WITHDRAWAL,100,0,EUR,withdrawal,source,Fineco';
    const request = (csv = manualCsv) => ({
      accountId: randomUUID(),
      name: 'Fineco',
      currency: 'EUR',
      csv
    });

    it('reads account metadata and rejects a file describing multiple accounts', () => {
      expect(service.inspectAccountCsv(manualCsv)).toEqual({
        name: 'Fineco',
        currency: 'EUR'
      });
      expect(() =>
        service.inspectAccountCsv(
          manualCsv.replace(
            'withdrawal,source,Fineco',
            'withdrawal,other,Fineco'
          )
        )
      ).toThrow('one account');
    });

    it('previews without creating an account, then creates account and movements together', async () => {
      const input = request();
      const preview = (await service.newAccountFromCsv(
        userId,
        input,
        true
      )) as CashCsvPreview;
      expect(preview.errors).toEqual([]);
      expect(preview.finalBalance).toBe('900');
      expect(
        await prisma.account.findFirst({
          where: { id: input.accountId, userId }
        })
      ).toBeNull();
      await service.newAccountFromCsv(
        userId,
        { ...input, digest: preview.digest },
        false
      );
      const account = await prisma.account.findFirst({
        where: { id: input.accountId, userId }
      });
      expect(account.name).toBe('Fineco');
      expect(account.currency).toBe('EUR');
      expect(
        (await service.get({ accountId: input.accountId, userId })).balances.at(
          -1
        ).value
      ).toBe('900');
      await expect(
        service.newAccountFromCsv(
          userId,
          { ...input, digest: preview.digest },
          false
        )
      ).rejects.toThrow('already created');
    });

    it('blocks missing financial activities and leaves no newly created account', async () => {
      const input = request(
        'Date,Operation,Amount,Currency,ActivityId,ActivityType,ActivityDate,DataSource,Symbol,ActivityCurrency,Quantity,UnitPrice,ActivityFee\n2026-10-02,ACTIVITY,-100,EUR,missing,BUY,2026-10-02,YAHOO,VWCE.MI,EUR,1,100,0'
      );
      const preview = (await service.newAccountFromCsv(
        userId,
        input,
        true
      )) as CashCsvPreview;
      expect(preview.errors.join()).toContain('activity');
      await expect(
        service.newAccountFromCsv(
          userId,
          { ...input, digest: preview.digest },
          false
        )
      ).rejects.toThrow();
      expect(
        await prisma.account.findFirst({
          where: { id: input.accountId, userId }
        })
      ).toBeNull();
    });

    it('binds confirmation to the previewed account details', async () => {
      const input = request();
      const preview = (await service.newAccountFromCsv(
        userId,
        input,
        true
      )) as CashCsvPreview;
      await expect(
        service.newAccountFromCsv(
          userId,
          { ...input, name: 'Changed', digest: preview.digest },
          false
        )
      ).rejects.toThrow('Preview');
      expect(
        await prisma.account.findFirst({
          where: { id: input.accountId, userId }
        })
      ).toBeNull();
    });

    it('rolls back the new account if a ledger projection fails', async () => {
      const input = request();
      const preview = (await service.newAccountFromCsv(
        userId,
        input,
        true
      )) as CashCsvPreview;
      const projection = jest
        .spyOn(
          service as unknown as { writeProjection: () => Promise<void> },
          'writeProjection'
        )
        .mockRejectedValueOnce(
          Error('Simulated new-account projection failure')
        );
      try {
        await expect(
          service.newAccountFromCsv(
            userId,
            { ...input, digest: preview.digest },
            false
          )
        ).rejects.toThrow('projection failure');
      } finally {
        projection.mockRestore();
      }
      expect(
        await prisma.account.findFirst({
          where: { id: input.accountId, userId }
        })
      ).toBeNull();
      expect(
        await prisma.cashEvent.count({
          where: { accountId: input.accountId, userId }
        })
      ).toBe(0);
    });

    it('requires explicit confirmation for a negative balance and rolls back until confirmed', async () => {
      const input = request(
        'Date,Operation,Amount,Currency\n2026-10-01,WITHDRAWAL,100,EUR'
      );
      const preview = (await service.newAccountFromCsv(
        userId,
        input,
        true
      )) as CashCsvPreview;
      expect(preview.minimumBalance).toBe('-100');
      await expect(
        service.newAccountFromCsv(
          userId,
          { ...input, digest: preview.digest },
          false
        )
      ).rejects.toThrow();
      expect(
        await prisma.account.findFirst({
          where: { id: input.accountId, userId }
        })
      ).toBeNull();
      await service.newAccountFromCsv(
        userId,
        { ...input, digest: preview.digest, confirmNegativeBalance: true },
        false
      );
      expect(
        (await service.get({ accountId: input.accountId, userId })).balances.at(
          -1
        ).value
      ).toBe('-100');
    });
  });
  it.each(['0', '1'])(
    'round-trips an exported zero movement with fee %s',
    async (fee) => {
      await service.createEvent({
        ...scope(),
        expectedRevision: 0,
        event: { date: '2026-10-01', type: 'MOVEMENT', amount: '0', fee },
        confirmNegativeBalance: true
      });
      const csv = (await service.exportCsv(scope())).csv;
      const input = {
        accountId: randomUUID(),
        name: 'Zero movement copy',
        currency: 'EUR',
        csv
      };
      const preview = (await service.newAccountFromCsv(
        userId,
        input,
        true
      )) as CashCsvPreview;
      expect(preview.errors).toEqual([]);
      expect(preview.finalBalance).toBe(fee === '0' ? '0' : '-1');
      await service.newAccountFromCsv(
        userId,
        { ...input, digest: preview.digest, confirmNegativeBalance: true },
        false
      );
      const copied = await service.get({ accountId: input.accountId, userId });
      expect(copied.events).toHaveLength(1);
      expect(copied.events[0]).toMatchObject({ type: 'MOVEMENT', amount: '0' });
      expect(copied.events[0].fee ?? '0').toBe(fee);
      const again = await service.previewCsv(
        { accountId: input.accountId, userId },
        csv
      );
      expect(again.errors).toEqual([]);
      expect(again.existingCount).toBe(1);
    }
  );

  it('retains the positive amount rule for hand-written deposit and withdrawal rows', async () => {
    for (const operation of ['DEPOSIT', 'WITHDRAWAL']) {
      const preview = await service.previewCsv(
        scope(),
        `Date,Operation,Amount,Currency\n2026-10-01,${operation},0,EUR`
      );
      expect(preview.errors.join()).toContain('positive Amount');
    }
  });

  it('round-trips pre-1970 cash history without permitting a zero sequence on a movement', async () => {
    await service.createEvent({
      ...scope(),
      expectedRevision: 0,
      event: { date: '1969-12-31', type: 'MOVEMENT', amount: '100' }
    });
    const csv = (await service.exportCsv(scope())).csv;
    const input = {
      accountId: randomUUID(),
      name: 'Historical cash',
      currency: 'EUR',
      csv
    };
    const preview = (await service.newAccountFromCsv(
      userId,
      input,
      true
    )) as CashCsvPreview;
    expect(preview.errors).toEqual([]);
    await service.newAccountFromCsv(
      userId,
      { ...input, digest: preview.digest },
      false
    );
    expect(
      (await service.get({ accountId: input.accountId, userId })).events[0].date
    ).toBe('1969-12-31');
    const invalid = await service.previewCsv(
      scope(),
      'Date,Operation,Amount,Currency,Sequence,Reference\n1969-12-30,DEPOSIT,10,EUR,0,invalid-zero'
    );
    expect(invalid.errors.join()).toContain('Sequence');
  });

  it('restores a sequence-zero checkpoint produced by the actual unification migration', async () => {
    // Temporary tables shadow public ones only for this transaction. The migration
    // is executed verbatim without changing any shared database schema or history.
    const migrated = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        'CREATE TEMP TABLE "AccountCashState" ("accountId" TEXT,"userId" TEXT,"currency" TEXT,"defaultUpdateCash" BOOLEAN,"openingDate" DATE,"openingBalance" NUMERIC,"lastSequence" INTEGER,"revision" INTEGER) ON COMMIT DROP'
      );
      await tx.$executeRawUnsafe(
        'CREATE TEMP TABLE "CashEvent" ("id" TEXT,"accountId" TEXT,"userId" TEXT,"date" DATE,"sequence" INTEGER CONSTRAINT "CashEvent_sequence_check" CHECK ("sequence">0),"type" TEXT,"value" NUMERIC,"createdAt" TIMESTAMP,"updatedAt" TIMESTAMP) ON COMMIT DROP'
      );
      await tx.$executeRawUnsafe(
        'CREATE TEMP TABLE "AccountBalance" ("id" TEXT,"accountId" TEXT,"userId" TEXT,"date" DATE,"value" NUMERIC,"createdAt" TIMESTAMP DEFAULT NOW(),"updatedAt" TIMESTAMP DEFAULT NOW(),"isCashManagementProjection" BOOLEAN DEFAULT false) ON COMMIT DROP'
      );
      await tx.$executeRaw`INSERT INTO "AccountCashState" VALUES (${accountId},${userId},'EUR',false,DATE '1970-01-01',1000,0,0)`;
      await tx.$executeRaw`INSERT INTO "AccountBalance" ("id","accountId","userId","date","value") VALUES (${randomUUID()},${accountId},${userId},DATE '1969-12-31',800)`;
      const sql = readFileSync(
        join(
          __dirname,
          '../../../../../prisma/migrations/20261021000000_unified_cash_ledger/migration.sql'
        ),
        'utf8'
      );
      for (const statement of sql.split(';').filter((s) => s.trim()))
        await tx.$executeRawUnsafe(statement);
      const [state] = await tx.$queryRaw<
        [
          {
            openingDate: Date;
            openingBalance: { toString(): string };
            lastSequence: number;
            revision: number;
            isAutomaticOpening: boolean;
          }
        ]
      >`SELECT * FROM "AccountCashState"`;
      const events = await tx.$queryRaw<
        { date: Date; sequence: number; value: { toString(): string } }[]
      >`SELECT * FROM "CashEvent" ORDER BY "date", "sequence"`;
      return { state, events };
    });
    expect(migrated.events.some((e) => e.sequence === 0)).toBe(true);
    await prisma.accountCashState.create({
      data: {
        accountId,
        userId,
        currency: 'EUR',
        openingDate: migrated.state.openingDate,
        openingBalance: migrated.state.openingBalance.toString(),
        isAutomaticOpening: migrated.state.isAutomaticOpening,
        lastSequence: migrated.state.lastSequence,
        events: {
          create: migrated.events.map((e) => ({
            date: e.date,
            sequence: e.sequence,
            type: 'CHECKPOINT',
            value: e.value.toString()
          }))
        }
      }
    });
    const csv = (await service.exportCsv(scope())).csv;
    const input = {
      accountId: randomUUID(),
      name: 'Migrated cash',
      currency: 'EUR',
      csv
    };
    const preview = (await service.newAccountFromCsv(
      userId,
      input,
      true
    )) as CashCsvPreview;
    expect(preview.errors).toEqual([]);
    expect(preview.finalBalance).toBe('1000');
    await service.newAccountFromCsv(
      userId,
      { ...input, digest: preview.digest },
      false
    );
    const restored = await service.get({ accountId: input.accountId, userId });
    expect(
      restored.events.some((e) => e.sequence === 0 && e.type === 'CHECKPOINT')
    ).toBe(true);
    expect(restored.balances.at(-1).value).toBe('1000');
  });
});
