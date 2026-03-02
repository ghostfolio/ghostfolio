import { PrismaClient } from '@prisma/client';
import { createHmac } from 'node:crypto';

const prisma = new PrismaClient();

const ACCESS_TOKEN_SALT =
  process.env.ACCESS_TOKEN_SALT ?? 'agentforge-dev-salt-2026';

function hashToken(plain: string): string {
  return createHmac('sha512', ACCESS_TOKEN_SALT).update(plain).digest('hex');
}

async function main() {
  // Tags — always seeded (upstream default)
  await prisma.tag.createMany({
    data: [
      { id: '4452656d-9fa4-4bd0-ba38-70492e31d180', name: 'EMERGENCY_FUND' },
      {
        id: 'f2e868af-8333-459f-b161-cbc6544c24bd',
        name: 'EXCLUDE_FROM_ANALYSIS'
      }
    ],
    skipDuplicates: true
  });

  // Demo portfolio data — opt-in via SEED_DEMO_DATA=true
  if (process.env.SEED_DEMO_DATA === 'true') {
    const DEMO_USER_ID = '403deeb8-edd5-4e64-99a9-3752782ad0a2';
    const DEMO_ACCOUNT_ID = 'c2a0c0f6-366b-4992-97ac-1adfa81d6cbc';
    const DEMO_ACCESS_TOKEN_PLAIN = 'demo-token-2026';

    // Demo user
    await prisma.user.upsert({
      where: { id: DEMO_USER_ID },
      update: {},
      create: {
        id: DEMO_USER_ID,
        accessToken: hashToken(DEMO_ACCESS_TOKEN_PLAIN),
        provider: 'ANONYMOUS',
        role: 'ADMIN'
      }
    });

    // Demo account
    await prisma.account.upsert({
      where: {
        id_userId: { id: DEMO_ACCOUNT_ID, userId: DEMO_USER_ID }
      },
      update: {},
      create: {
        id: DEMO_ACCOUNT_ID,
        userId: DEMO_USER_ID,
        name: 'Main Brokerage',
        balance: 5000,
        currency: 'USD',
        isExcluded: false
      }
    });

    // Symbol profiles
    const symbols = [
      {
        id: 'd8f0b8c3-212c-48ef-a837-fff75ef98176',
        symbol: 'AAPL',
        name: 'Apple Inc.',
        currency: 'USD',
        dataSource: 'YAHOO' as const,
        assetClass: 'EQUITY' as const,
        assetSubClass: 'STOCK' as const
      },
      {
        id: '5bb696ab-aaf3-4924-a0e4-79c69bfcd81b',
        symbol: 'MSFT',
        name: 'Microsoft Corporation',
        currency: 'USD',
        dataSource: 'YAHOO' as const,
        assetClass: 'EQUITY' as const,
        assetSubClass: 'STOCK' as const
      },
      {
        id: '7df6544c-c592-459c-af69-aafe65db60c9',
        symbol: 'VOO',
        name: 'Vanguard S&P 500 ETF',
        currency: 'USD',
        dataSource: 'YAHOO' as const,
        assetClass: 'EQUITY' as const,
        assetSubClass: 'ETF' as const
      },
      {
        id: 'ba75d50e-34f6-4c9e-bbb7-71b43b7cbfc0',
        symbol: 'GOOGL',
        name: 'Alphabet Inc.',
        currency: 'USD',
        dataSource: 'YAHOO' as const,
        assetClass: 'EQUITY' as const,
        assetSubClass: 'STOCK' as const
      },
      {
        id: '8b846370-2e16-4594-9785-a94da15d60a1',
        symbol: 'bitcoin',
        name: 'Bitcoin',
        currency: 'USD',
        dataSource: 'COINGECKO' as const,
        assetClass: 'ALTERNATIVE_INVESTMENT' as const,
        assetSubClass: 'CRYPTOCURRENCY' as const
      }
    ];

    for (const sp of symbols) {
      await prisma.symbolProfile.upsert({
        where: {
          dataSource_symbol: { dataSource: sp.dataSource, symbol: sp.symbol }
        },
        update: {},
        create: {
          id: sp.id,
          symbol: sp.symbol,
          name: sp.name,
          currency: sp.currency,
          dataSource: sp.dataSource,
          assetClass: sp.assetClass,
          assetSubClass: sp.assetSubClass
        }
      });
    }

    // Resolve actual symbolProfile IDs (may differ if profiles pre-existed)
    const profileLookup = new Map<string, string>();
    for (const sp of symbols) {
      const found = await prisma.symbolProfile.findUnique({
        where: {
          dataSource_symbol: { dataSource: sp.dataSource, symbol: sp.symbol }
        },
        select: { id: true }
      });
      if (found) {
        profileLookup.set(sp.id, found.id);
      }
    }

    // Orders
    const orders = [
      {
        id: '49f6cba4-7dd2-47e1-918e-4d8538e3818f',
        seedProfileId: 'd8f0b8c3-212c-48ef-a837-fff75ef98176',
        type: 'BUY' as const,
        quantity: 15,
        unitPrice: 178.5,
        fee: 0,
        date: new Date('2024-03-15'),
        currency: 'USD'
      },
      {
        id: '7090411c-a046-4363-a89e-d61d28417820',
        seedProfileId: '5bb696ab-aaf3-4924-a0e4-79c69bfcd81b',
        type: 'BUY' as const,
        quantity: 10,
        unitPrice: 420.0,
        fee: 0,
        date: new Date('2024-04-01'),
        currency: 'USD'
      },
      {
        id: '06cd0784-c5f4-42a0-b799-eb48b61b7afb',
        seedProfileId: '7df6544c-c592-459c-af69-aafe65db60c9',
        type: 'BUY' as const,
        quantity: 20,
        unitPrice: 480.0,
        fee: 0,
        date: new Date('2024-01-10'),
        currency: 'USD'
      },
      {
        id: '151b2a27-f82f-4393-85b2-a57660fc2d25',
        seedProfileId: 'ba75d50e-34f6-4c9e-bbb7-71b43b7cbfc0',
        type: 'BUY' as const,
        quantity: 8,
        unitPrice: 155.0,
        fee: 0,
        date: new Date('2024-06-20'),
        currency: 'USD'
      },
      {
        id: 'abc07d0a-3be2-4185-9ae4-d2b0fa4a5d48',
        seedProfileId: '8b846370-2e16-4594-9785-a94da15d60a1',
        type: 'BUY' as const,
        quantity: 0.5,
        unitPrice: 43000.0,
        fee: 0,
        date: new Date('2024-02-01'),
        currency: 'USD'
      },
      {
        id: 'e3a1f7c2-8d94-4b61-a5e3-9c72d1f08e34',
        seedProfileId: 'd8f0b8c3-212c-48ef-a837-fff75ef98176',
        type: 'BUY' as const,
        quantity: 5,
        unitPrice: 195.0,
        fee: 0,
        date: new Date('2024-09-15'),
        currency: 'USD'
      },
      {
        id: 'f7b2c8d1-6e45-4a93-b812-d3e9f0a17c56',
        seedProfileId: '7df6544c-c592-459c-af69-aafe65db60c9',
        type: 'DIVIDEND' as const,
        quantity: 0,
        unitPrice: 1.78,
        fee: 0,
        date: new Date('2024-12-20'),
        currency: 'USD'
      },
      {
        id: 'a1c3e5f7-2b4d-4869-9a0c-e6f8d2b4a7c1',
        seedProfileId: '5bb696ab-aaf3-4924-a0e4-79c69bfcd81b',
        type: 'SELL' as const,
        quantity: 3,
        unitPrice: 450.0,
        fee: 0,
        date: new Date('2025-01-10'),
        currency: 'USD'
      }
    ];

    for (const ord of orders) {
      const symbolProfileId = profileLookup.get(ord.seedProfileId);
      if (!symbolProfileId) {
        console.warn(
          `Skipping order ${ord.id}: no symbolProfile found for seed ID ${ord.seedProfileId}`
        );
        continue;
      }
      await prisma.order.upsert({
        where: { id: ord.id },
        update: { symbolProfileId },
        create: {
          id: ord.id,
          userId: DEMO_USER_ID,
          accountId: DEMO_ACCOUNT_ID,
          accountUserId: DEMO_USER_ID,
          symbolProfileId,
          type: ord.type,
          quantity: ord.quantity,
          unitPrice: ord.unitPrice,
          fee: ord.fee,
          date: ord.date,
          currency: ord.currency
        }
      });
    }

    console.log('Seeded demo user, account, symbols, and orders.');
    console.log(`    Login token: ${DEMO_ACCESS_TOKEN_PLAIN}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
