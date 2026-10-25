import { AccountBalanceService } from '@ghostfolio/api/app/account-balance/account-balance.service';
import { CashManagementService } from '@ghostfolio/api/app/account-balance/cash-management.service';
import { ExportService } from '@ghostfolio/api/app/endpoints/export/export.service';
import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';

import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'node:crypto';

import { PortfolioRestoreDto } from './portfolio-restore.dto';
import { PortfolioRestoreService } from './portfolio-restore.service';

const url = process.env.CASH_TEST_DATABASE_URL;
const describeDb = url ? describe : describe.skip;
describeDb('Portfolio JSON restore with PostgreSQL', () => {
  let prisma: PrismaService;
  let cash: CashManagementService;
  let service: PortfolioRestoreService;
  let userId: string;
  const users: string[] = [];
  const emitter = new EventEmitter2();
  const gathering = { gatherSymbols: jest.fn().mockResolvedValue(undefined) };
  beforeAll(async () => {
    const destination = new URL(url);
    if (!destination.pathname.startsWith('/cash_test'))
      throw Error('Disposable test database required');
    prisma = new PrismaService(
      new ConfigService({ DATABASE_URL: url, LOG_LEVELS: '[]' })
    );
    await prisma.$connect();
    cash = new CashManagementService(emitter, prisma);
    service = new PortfolioRestoreService(
      prisma,
      cash,
      emitter,
      gathering as never
    );
  });
  beforeEach(async () => {
    userId = randomUUID();
    users.push(userId);
    await prisma.user.create({ data: { id: userId } });
  });
  afterAll(async () => {
    if (prisma) {
      const profiles = await prisma.symbolProfile.findMany({
        where: { userId: { in: users } },
        select: { symbol: true }
      });
      await prisma.marketData.deleteMany({
        where: {
          dataSource: 'MANUAL',
          symbol: { in: profiles.map((p) => p.symbol) }
        }
      });
      await prisma.cashEvent.deleteMany({
        where: { userId: { in: users } }
      });
      await prisma.user.deleteMany({ where: { id: { in: users } } });
      await prisma.$disconnect();
    }
  });
  function fixture(): PortfolioRestoreDto {
    const accountId = randomUUID(),
      activityId = randomUUID(),
      symbol = randomUUID();
    return {
      choices: [{ sourceId: accountId, targetId: 'NEW' }],
      restoreSettings: true,
      backup: {
        user: {
          settings: { currency: 'EUR', performanceCalculationType: 'TWR' }
        },
        accounts: [
          {
            id: accountId,
            name: 'Restore test account',
            currency: 'EUR',
            platformId: null,
            cashManagement: {
              version: 1,
              currency: 'EUR',
              defaultUpdateCash: true,
              includeCashInPortfolio: true,
              openingBalance: { date: '2026-01-01', sequence: 0, balance: '0' },
              events: [
                {
                  id: randomUUID(),
                  type: 'MOVEMENT',
                  amount: '5000',
                  fee: '0',
                  date: '2026-01-01',
                  sequence: 1,
                  importReference: 'bank-deposit'
                },
                {
                  id: randomUUID(),
                  type: 'MOVEMENT',
                  amount: '-301',
                  fee: '0',
                  date: '2026-02-02',
                  sequence: 2,
                  orderId: activityId
                }
              ]
            }
          }
        ],
        activities: [
          {
            id: activityId,
            accountId,
            currency: 'EUR',
            dataSource: 'MANUAL' as never,
            date: '2026-02-02T12:00:00.000Z',
            fee: 1,
            quantity: 3,
            unitPrice: 100,
            symbol,
            type: 'BUY' as never
          }
        ],
        assetProfiles: [
          {
            currency: 'EUR',
            dataSource: 'MANUAL' as never,
            symbol,
            name: 'Restored custom asset',
            marketData: [
              { date: '2026-02-02' as never, marketPrice: 100 } as never
            ]
          }
        ]
      }
    };
  }
  async function commit(input: PortfolioRestoreDto) {
    const plan = await service.run(input, userId, true);
    expect(plan.errors).toEqual([]);
    return service.run({ ...input, digest: plan.digest }, userId, false);
  }
  it('previews without writes, restores linked activity and cash with fresh IDs, and can export and restore a second time', async () => {
    const input = fixture();
    const sourceId = input.backup.accounts[0].id;
    const plan = await service.run(input, userId, true);
    expect(plan.cashEvents).toBe(2);
    expect(plan.accounts[0].cashBalance).toBe('4699');
    expect(await prisma.account.count({ where: { userId } })).toBe(0);
    await service.run({ ...input, digest: plan.digest }, userId, false);
    const account = await prisma.account.findFirst({ where: { userId } });
    expect(account.id).not.toBe(sourceId);
    const state = await cash.get({ accountId: account.id, userId });
    expect(state.balances.at(-1).value).toBe('4699');
    const linked = state.events.find((e) => e.orderId);
    const order = await prisma.order.findUnique({
      where: { id: linked.orderId },
      include: { SymbolProfile: true }
    });
    expect(order.id).not.toBe(input.backup.activities[0].id);
    expect(order.accountId).toBe(account.id);
    expect(order.SymbolProfile.userId).toBe(userId);
    expect(
      await prisma.marketData.count({
        where: { symbol: order.SymbolProfile.symbol }
      })
    ).toBe(1);
    const prefs = await prisma.settings.findUnique({ where: { userId } });
    expect(prefs.settings).toMatchObject({
      baseCurrency: 'EUR',
      performanceCalculationType: 'TWR'
    });
    // Simulate a second server/user: the exported source identifiers may still exist here.
    const second = randomUUID();
    users.push(second);
    await prisma.user.create({ data: { id: second } });
    const exported: PortfolioRestoreDto = {
      choices: [{ sourceId: account.id, targetId: 'NEW' }],
      backup: {
        ...input.backup,
        accounts: [
          {
            ...input.backup.accounts[0],
            id: account.id,
            cashManagement: {
              ...input.backup.accounts[0].cashManagement,
              events: state.events
            }
          }
        ],
        activities: [
          { ...input.backup.activities[0], id: order.id, accountId: account.id }
        ]
      }
    };
    const next = await service.run(exported, second, true);
    expect(next.errors).toEqual([]);
    await service.run({ ...exported, digest: next.digest }, second, false);
    const secondAccount = await prisma.account.findFirst({
      where: { userId: second }
    });
    expect(
      (
        await cash.get({ accountId: secondAccount.id, userId: second })
      ).balances.at(-1).value
    ).toBe('4699');
  });
  it.each([
    {
      direction: 'Cash to Legacy',
      reverse: false,
      legacyCurrency: 'EUR',
      convertedAmount: 25
    },
    {
      direction: 'Legacy to Cash',
      reverse: true,
      legacyCurrency: 'EUR',
      convertedAmount: 25
    },
    {
      direction: 'Cash EUR to Legacy USD',
      reverse: false,
      legacyCurrency: 'USD',
      convertedAmount: 22.5
    }
  ])(
    'round-trips $direction without replaying the legacy balance',
    async ({ reverse, legacyCurrency, convertedAmount }) => {
      const managed = await prisma.account.create({
        data: { userId, currency: 'EUR', name: 'Managed source' }
      });
      const legacy = await prisma.account.create({
        data: { userId, currency: legacyCurrency, name: 'Legacy destination' }
      });

      await cash.open({
        accountId: managed.id,
        userId,
        date: '2026-01-01',
        balance: reverse ? '0' : '100'
      });

      if (reverse) {
        await prisma.accountBalance.create({
          data: {
            accountId: legacy.id,
            userId,
            date: new Date('2026-01-01T00:00:00.000Z'),
            value: 100
          }
        });
      }

      const transferService = new CashManagementService(emitter, prisma, {
        toCurrencyAtDate: jest.fn((amount: number, from: string, to: string) =>
          from === 'EUR' && to === 'USD' ? convertedAmount : amount
        )
      } as never);

      await transferService.transfer({
        accountIdFrom: reverse ? legacy.id : managed.id,
        accountIdTo: reverse ? managed.id : legacy.id,
        balance: 25,
        userId
      });

      const original = await prisma.cashEvent.findMany({
        where: { userId, transferId: { not: null } }
      });
      expect(original).toHaveLength(1);
      expect(original[0].transferCounterpartyMode).toBe('LEGACY');
      expect(original[0].transferCounterpartyAccountId).toBe(legacy.id);
      expect(original[0].transferCounterpartyAmount.toString()).toBe(
        reverse ? '-25' : String(convertedAmount)
      );

      const exporter = new ExportService(
        {
          accounts: ({ where }) =>
            prisma.account.findMany({
              where,
              include: { balances: true, tags: true, platform: true }
            })
        } as never,
        { getActivities: async () => ({ activities: [] }) } as never,
        null,
        { getTagsForUser: async () => [] } as never,
        cash
      );

      const backup = await exporter.export({
        userId,
        userSettings: { baseCurrency: 'EUR' } as never
      });

      const sourceCash = backup.accounts.find((a) => a.id === managed.id);
      const sourceLegacy = backup.accounts.find((a) => a.id === legacy.id);

      expect(sourceCash.cashManagement.events).toHaveLength(1);
      expect(sourceCash.cashManagement.events[0].transferCounterparty).toEqual({
        accountId: legacy.id,
        mode: 'LEGACY',
        amount: reverse ? '-25' : String(convertedAmount),
        currency: legacyCurrency
      });
      expect(sourceLegacy).not.toHaveProperty('cashManagement');
      expect(sourceLegacy.balances.length).toBeGreaterThan(0);
      expect(sourceLegacy.balances.at(-1).value).toBe(
        reverse ? 75 : convertedAmount
      );

      const restoredUserId = randomUUID();
      users.push(restoredUserId);
      await prisma.user.create({ data: { id: restoredUserId } });

      const input = (await new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true
      }).transform(
        {
          backup,
          choices: backup.accounts.map((a) => ({
            sourceId: a.id,
            targetId: 'NEW'
          }))
        },
        { metatype: PortfolioRestoreDto, type: 'body' }
      )) as PortfolioRestoreDto;

      const preview = await service.run(input, restoredUserId, true);
      expect(preview.errors).toEqual([]);
      await service.run(
        { ...input, digest: preview.digest },
        restoredUserId,
        false
      );

      const restoredCash = await prisma.account.findFirstOrThrow({
        where: { userId: restoredUserId, name: 'Managed source' }
      });
      const restoredLegacy = await prisma.account.findFirstOrThrow({
        where: { userId: restoredUserId, name: 'Legacy destination' },
        include: { balances: true, cashState: true }
      });
      const events = await prisma.cashEvent.findMany({
        where: { userId: restoredUserId, transferId: { not: null } }
      });

      expect(restoredCash.id).not.toBe(managed.id);
      expect(restoredLegacy.id).not.toBe(legacy.id);
      expect(events).toHaveLength(1);
      expect(events[0].transferCounterpartyAccountId).toBe(restoredLegacy.id);
      expect(events[0].transferCounterpartyMode).toBe('LEGACY');
      expect(events[0].transferCounterpartyAmount.toString()).toBe(
        reverse ? '-25' : String(convertedAmount)
      );
      expect(events[0].transferCounterpartyCurrency).toBe(legacyCurrency);
      expect(events[0].transferId).not.toBe(original[0].transferId);

      expect(
        (
          await cash.get({
            accountId: restoredCash.id,
            userId: restoredUserId
          })
        ).balances.at(-1).value
      ).toBe(reverse ? '25' : '75');

      expect(restoredLegacy.cashState).toBeNull();
      expect(restoredLegacy.balances).toHaveLength(
        sourceLegacy.balances.length
      );
      expect(restoredLegacy.balances.at(-1).value).toBe(
        reverse ? 75 : convertedAmount
      );
    }
  );

  it('accepts old exports without activity IDs or cash ledger', async () => {
    const input = fixture();
    delete input.backup.accounts[0].cashManagement;
    delete input.backup.activities[0].id;
    input.backup.accounts[0].balances = [
      { date: new Date('2026-01-01'), value: 700 } as never
    ];
    await commit(input);
    expect(await prisma.order.count({ where: { userId } })).toBe(1);
    expect(
      (await prisma.accountBalance.findFirst({ where: { userId } })).value
    ).toBe(700);
  });
  it('rejects missing links before any write', async () => {
    const input = fixture();
    delete input.backup.activities[0].id;
    const plan = await service.run(input, userId, true);
    expect(plan.errors.join()).toContain('linked activity is missing');
    await expect(
      service.run({ ...input, digest: plan.digest }, userId, false)
    ).rejects.toThrow();
    expect(await prisma.account.count({ where: { userId } })).toBe(0);
  });
  it('rolls back accounts, assets, activities and cash if the final ledger write fails', async () => {
    const input = fixture();
    const plan = await service.run(input, userId, true);
    const restore = jest
      .spyOn(cash, 'restoreInTransaction')
      .mockRejectedValueOnce(Error('simulated projection failure'));
    await expect(
      service.run({ ...input, digest: plan.digest }, userId, false)
    ).rejects.toThrow('simulated projection failure');
    restore.mockRestore();
    expect(await prisma.account.count({ where: { userId } })).toBe(0);
    expect(await prisma.order.count({ where: { userId } })).toBe(0);
    expect(await prisma.symbolProfile.count({ where: { userId } })).toBe(0);
    expect(await prisma.cashEvent.count({ where: { userId } })).toBe(0);
  });
  it('detects changes after preview and rejects a double submission', async () => {
    const input = fixture();
    const plan = await service.run(input, userId, true);
    await service.run({ ...input, digest: plan.digest }, userId, false);
    await expect(
      service.run({ ...input, digest: plan.digest }, userId, false)
    ).rejects.toThrow('changed');
    expect(await prisma.order.count({ where: { userId } })).toBe(1);
  });
  it('requires both sides of a transfer and remaps transfer identifiers', async () => {
    const input = fixture(),
      first = input.backup.accounts[0],
      secondId = randomUUID(),
      transferId = randomUUID();
    first.cashManagement.events.push({
      id: randomUUID(),
      date: '2026-03-01',
      sequence: 3,
      type: 'MOVEMENT',
      amount: '-20',
      transferId
    });
    input.backup.accounts.push({
      id: secondId,
      name: 'Other account',
      currency: 'EUR',
      platformId: null,
      cashManagement: {
        ...first.cashManagement,
        events: [
          {
            id: randomUUID(),
            date: '2026-03-01',
            sequence: 1,
            type: 'MOVEMENT',
            amount: '20',
            transferId
          }
        ]
      }
    });
    input.choices.push({ sourceId: secondId, targetId: 'SKIP' });
    expect((await service.run(input, userId, true)).errors.join()).toContain(
      'both source and destination'
    );
    input.choices[1].targetId = 'NEW';
    await commit(input);
    const events = await prisma.cashEvent.findMany({
      where: { userId, transferId: { not: null } }
    });
    expect(events).toHaveLength(2);
    expect(events[0].transferId).toBe(events[1].transferId);
    expect(events[0].transferId).not.toBe(transferId);
  });
  it('does not match account names and refuses another users account', async () => {
    const input = fixture();
    await prisma.account.create({
      data: { userId, name: input.backup.accounts[0].name, currency: 'EUR' }
    });
    expect((await service.run(input, userId, true)).accounts[0].action).toBe(
      'NEW'
    );
    const other = randomUUID();
    users.push(other);
    await prisma.user.create({ data: { id: other } });
    const foreign = await prisma.account.create({
      data: { userId: other, currency: 'EUR' }
    });
    input.choices[0].targetId = foreign.id;
    expect((await service.run(input, userId, true)).errors.join()).toContain(
      'Destination account not found'
    );
  });
  it('associates an empty existing account explicitly and protects existing ledgers', async () => {
    const input = fixture();
    const target = await prisma.account.create({
      data: { userId, currency: 'EUR', name: 'Existing' }
    });
    input.choices[0].targetId = target.id;
    await commit(input);
    expect(await prisma.account.count({ where: { userId } })).toBe(1);
    expect((await service.run(input, userId, true)).errors.join()).toContain(
      'already has cash history'
    );
  });
  it('keeps unmanaged balances before the cash ledger opening', async () => {
    const input = fixture();
    input.backup.accounts[0].balances = [
      { date: new Date('2025-12-01'), value: 123 } as never
    ];
    await commit(input);
    const balances = await prisma.accountBalance.findMany({
      where: { userId },
      orderBy: { date: 'asc' }
    });
    expect(balances[0].date.toISOString().slice(0, 10)).toBe('2025-12-01');
    expect(balances[0].value).toBe(123);
    expect(balances.at(-1).value).toBe(4699);
  });

  it('restores settings for a new user with an empty default account', async () => {
    await prisma.account.create({
      data: { userId, name: 'My Account', currency: 'CHF' }
    });
    await commit(fixture());
    expect(
      (await prisma.settings.findUnique({ where: { userId } })).settings
    ).toMatchObject({ baseCurrency: 'EUR' });
  });

  it('recognizes an existing financial activity in an explicitly selected account without adding it again', async () => {
    const input = fixture();
    delete input.backup.accounts[0].cashManagement;
    const target = await prisma.account.create({
      data: { userId, currency: 'EUR', name: 'Target' }
    });
    const a = input.backup.activities[0];
    const profile = await prisma.symbolProfile.create({
      data: { userId, dataSource: 'MANUAL', symbol: a.symbol, currency: 'EUR' }
    });
    await prisma.order.create({
      data: {
        userId,
        accountId: target.id,
        accountUserId: userId,
        symbolProfileId: profile.id,
        date: new Date(a.date),
        type: a.type,
        quantity: a.quantity,
        unitPrice: a.unitPrice,
        fee: a.fee,
        currency: a.currency
      }
    });
    input.choices[0].targetId = target.id;
    const plan = await service.run(input, userId, true);
    expect(plan.duplicates).toBe(1);
    expect(plan.newActivities).toBe(0);
    await service.run({ ...input, digest: plan.digest }, userId, false);
    expect(await prisma.order.count({ where: { userId } })).toBe(1);
    expect(await prisma.symbolProfile.count({ where: { userId } })).toBe(1);
  });

  it('restores cash after activities were imported first, even if a manual symbol changed', async () => {
    const input = fixture();
    const a = input.backup.activities[0];
    const target = await prisma.account.create({
      data: { userId, currency: 'EUR', name: 'Activities imported first' }
    });
    const profile = await prisma.symbolProfile.create({
      data: {
        userId,
        dataSource: 'MANUAL',
        symbol: randomUUID(),
        name: input.backup.assetProfiles[0].name,
        currency: 'EUR'
      }
    });
    await prisma.order.create({
      data: {
        userId,
        accountId: target.id,
        accountUserId: userId,
        symbolProfileId: profile.id,
        date: new Date(a.date),
        type: a.type,
        quantity: a.quantity,
        unitPrice: a.unitPrice,
        fee: a.fee,
        currency: a.currency
      }
    });
    input.choices[0].targetId = target.id;
    const plan = await service.run(input, userId, true);
    expect(plan.errors).toEqual([]);
    expect(plan.duplicates).toBe(1);
    await service.run({ ...input, digest: plan.digest }, userId, false);
    expect(await prisma.order.count({ where: { userId } })).toBe(1);
    expect(
      (await cash.get({ accountId: target.id, userId })).balances.at(-1).value
    ).toBe('4699');
  });
  it.each([
    { currency: 'EUR', withBalance: false },
    { currency: 'EUR', withBalance: true },
    { currency: null, withBalance: false },
    { currency: null, withBalance: true }
  ])(
    'preserves legacy mode through actual JSON export and restore: %j',
    async ({ currency, withBalance }) => {
      const source = await prisma.account.create({
        data: { userId, name: 'Legacy account', currency }
      });
      if (withBalance)
        await prisma.accountBalance.create({
          data: {
            accountId: source.id,
            userId,
            date: new Date('2026-01-01T00:00:00Z'),
            value: 100
          }
        });
      const exporter = new ExportService(
        {
          accounts: ({ where }) =>
            prisma.account.findMany({
              where,
              include: { balances: true, tags: true, platform: true }
            })
        } as never,
        { getActivities: async () => ({ activities: [] }) } as never,
        null,
        { getTagsForUser: async () => [] } as never,
        cash
      );
      const backup = await exporter.export({
        userId,
        userSettings: { baseCurrency: 'EUR' } as never
      });
      expect(backup.accounts).toHaveLength(1);
      expect(backup.accounts[0]).not.toHaveProperty('cashManagement');
      expect(backup.accounts[0].currency).toBe(currency);
      expect(backup.accounts[0].balances).toHaveLength(withBalance ? 1 : 0);
      expect(await prisma.accountCashState.count({ where: { userId } })).toBe(
        0
      );
      const destinationId = randomUUID();
      users.push(destinationId);
      await prisma.user.create({ data: { id: destinationId } });
      const input = (await new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true
      }).transform(
        { backup, choices: [{ sourceId: source.id, targetId: 'NEW' }] },
        { metatype: PortfolioRestoreDto, type: 'body' }
      )) as PortfolioRestoreDto;
      const preview = await service.run(input, destinationId, true);
      expect(preview.errors).toEqual([]);
      await service.run(
        { ...input, digest: preview.digest },
        destinationId,
        false
      );
      const target = await prisma.account.findFirst({
        where: { userId: destinationId },
        include: { balances: true, cashState: true }
      });
      expect(target.currency).toBe(currency);
      expect(target.cashState).toBeNull();
      expect(target.balances).toHaveLength(withBalance ? 1 : 0);
      const writer = new AccountBalanceService(emitter, null, prisma, cash);
      const written = await writer.createOrUpdateAccountBalance({
        accountId: target.id,
        userId: destinationId,
        date: '2026-01-02',
        balance: 250
      });
      expect(written.value).toBe(250);
      expect(
        await cash.getPersisted({ accountId: target.id, userId: destinationId })
      ).toBeNull();
    }
  );

  it('exports a persisted cash ledger but keeps a legacy account unactivated in the same backup', async () => {
    const active = await prisma.account.create({
      data: { userId, name: 'Active', currency: 'EUR' }
    });
    const legacy = await prisma.account.create({
      data: { userId, name: 'Legacy', currency: null }
    });
    await cash.createEvent({
      accountId: active.id,
      userId,
      expectedRevision: 0,
      event: { date: '2026-01-01', type: 'MOVEMENT', amount: '100' }
    });
    const exporter = new ExportService(
      {
        accounts: ({ where }) =>
          prisma.account.findMany({
            where,
            include: { balances: true, tags: true, platform: true }
          })
      } as never,
      { getActivities: async () => ({ activities: [] }) } as never,
      null,
      { getTagsForUser: async () => [] } as never,
      cash
    );
    const backup = await exporter.export({
      userId,
      userSettings: { baseCurrency: 'EUR' } as never
    });
    expect(
      backup.accounts.find((a) => a.id === active.id).cashManagement.events
    ).toHaveLength(1);
    expect(backup.accounts.find((a) => a.id === legacy.id)).not.toHaveProperty(
      'cashManagement'
    );
    expect(await prisma.accountCashState.count({ where: { userId } })).toBe(1);
  });
});
