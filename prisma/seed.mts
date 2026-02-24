import { PrismaClient } from '@prisma/client';
import { createHmac } from 'node:crypto';

const prisma = new PrismaClient();

const DEMO_USER_ID = 'demo0000-0000-0000-0000-000000000000';
const DEMO_ACCOUNT_ID = 'demo-acc0-0000-0000-000000000000';

function createAccessToken(password: string, salt: string): string {
  const hash = createHmac('sha512', salt);
  hash.update(password);
  return hash.digest('hex');
}

async function main() {
  // Create default tags
  await prisma.tag.createMany({
    data: [
      {
        id: '4452656d-9fa4-4bd0-ba38-70492e31d180',
        name: 'EMERGENCY_FUND'
      },
      {
        id: 'f2e868af-8333-459f-b161-cbc6544c24bd',
        name: 'EXCLUDE_FROM_ANALYSIS'
      }
    ],
    skipDuplicates: true
  });

  // Create demo user for evaluators (if not already exists)
  const accessTokenSalt = process.env.ACCESS_TOKEN_SALT;
  if (!accessTokenSalt) {
    console.log('ACCESS_TOKEN_SALT not set, skipping demo user creation');
    return;
  }

  const existingDemoUser = await prisma.user.findUnique({
    where: { id: DEMO_USER_ID }
  });

  if (existingDemoUser) {
    console.log('Demo user already exists, skipping creation');
    return;
  }

  console.log('Creating demo user with portfolio data...');

  // Generate access token for demo user
  const rawAccessToken = 'demo-access-token-for-ghostfolio-ai-eval';
  const hashedAccessToken = createAccessToken(rawAccessToken, accessTokenSalt);

  // Create demo user with DEMO role
  await prisma.user.create({
    data: {
      id: DEMO_USER_ID,
      accessToken: hashedAccessToken,
      role: 'DEMO',
      provider: 'ANONYMOUS',
      settings: {
        create: {
          settings: {
            baseCurrency: 'USD',
            locale: 'en-US',
            language: 'en',
            viewMode: 'DEFAULT'
          }
        }
      }
    }
  });

  // Create demo account
  await prisma.account.create({
    data: {
      id: DEMO_ACCOUNT_ID,
      name: 'Demo Portfolio',
      currency: 'USD',
      userId: DEMO_USER_ID
    }
  });

  // Create symbol profiles for demo holdings (if not exists)
  const symbols = [
    {
      symbol: 'AAPL',
      name: 'Apple Inc.',
      currency: 'USD',
      dataSource: 'YAHOO',
      assetClass: 'EQUITY',
      assetSubClass: 'STOCK'
    },
    {
      symbol: 'MSFT',
      name: 'Microsoft Corporation',
      currency: 'USD',
      dataSource: 'YAHOO',
      assetClass: 'EQUITY',
      assetSubClass: 'STOCK'
    },
    {
      symbol: 'VTI',
      name: 'Vanguard Total Stock Market ETF',
      currency: 'USD',
      dataSource: 'YAHOO',
      assetClass: 'EQUITY',
      assetSubClass: 'ETF'
    },
    {
      symbol: 'GOOGL',
      name: 'Alphabet Inc.',
      currency: 'USD',
      dataSource: 'YAHOO',
      assetClass: 'EQUITY',
      assetSubClass: 'STOCK'
    },
    {
      symbol: 'AMZN',
      name: 'Amazon.com Inc.',
      currency: 'USD',
      dataSource: 'YAHOO',
      assetClass: 'EQUITY',
      assetSubClass: 'STOCK'
    }
  ];

  for (const s of symbols) {
    await prisma.symbolProfile.upsert({
      where: {
        dataSource_symbol: {
          dataSource: s.dataSource as any,
          symbol: s.symbol
        }
      },
      create: {
        symbol: s.symbol,
        name: s.name,
        currency: s.currency,
        dataSource: s.dataSource as any,
        assetClass: s.assetClass as any,
        assetSubClass: s.assetSubClass as any
      },
      update: {}
    });
  }

  // Create demo activities (BUY orders)
  const activities = [
    {
      symbol: 'AAPL',
      dataSource: 'YAHOO',
      quantity: 15,
      unitPrice: 150,
      date: new Date('2024-01-15')
    },
    {
      symbol: 'MSFT',
      dataSource: 'YAHOO',
      quantity: 10,
      unitPrice: 380,
      date: new Date('2024-02-01')
    },
    {
      symbol: 'VTI',
      dataSource: 'YAHOO',
      quantity: 25,
      unitPrice: 230,
      date: new Date('2024-03-10')
    },
    {
      symbol: 'GOOGL',
      dataSource: 'YAHOO',
      quantity: 8,
      unitPrice: 140,
      date: new Date('2024-04-05')
    },
    {
      symbol: 'AMZN',
      dataSource: 'YAHOO',
      quantity: 12,
      unitPrice: 178,
      date: new Date('2024-05-20')
    },
    {
      symbol: 'AAPL',
      dataSource: 'YAHOO',
      quantity: 0,
      unitPrice: 0.82,
      date: new Date('2024-08-15'),
      type: 'DIVIDEND'
    },
    {
      symbol: 'MSFT',
      dataSource: 'YAHOO',
      quantity: 0,
      unitPrice: 0.75,
      date: new Date('2024-09-12'),
      type: 'DIVIDEND'
    }
  ];

  for (const a of activities) {
    const profile = await prisma.symbolProfile.findFirst({
      where: {
        symbol: a.symbol,
        dataSource: a.dataSource as any
      }
    });

    if (!profile) continue;

    await prisma.order.create({
      data: {
        accountId: DEMO_ACCOUNT_ID,
        accountUserId: DEMO_USER_ID,
        currency: 'USD',
        date: a.date,
        fee: 0,
        quantity: a.type === 'DIVIDEND' ? 0 : a.quantity,
        symbolProfileId: profile.id,
        type: a.type === 'DIVIDEND' ? 'DIVIDEND' : 'BUY',
        unitPrice: a.unitPrice,
        userId: DEMO_USER_ID
      }
    });
  }

  // Set DEMO_USER_ID and DEMO_ACCOUNT_ID in Property table
  await prisma.property.upsert({
    where: { key: 'DEMO_USER_ID' },
    create: { key: 'DEMO_USER_ID', value: `"${DEMO_USER_ID}"` },
    update: { value: `"${DEMO_USER_ID}"` }
  });

  await prisma.property.upsert({
    where: { key: 'DEMO_ACCOUNT_ID' },
    create: { key: 'DEMO_ACCOUNT_ID', value: `"${DEMO_ACCOUNT_ID}"` },
    update: { value: `"${DEMO_ACCOUNT_ID}"` }
  });

  console.log('Demo user created successfully!');
  console.log(`  User ID: ${DEMO_USER_ID}`);
  console.log(`  Account ID: ${DEMO_ACCOUNT_ID}`);
  console.log('  Evaluators can visit /demo to auto-login, then /ai-chat to use AI.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
