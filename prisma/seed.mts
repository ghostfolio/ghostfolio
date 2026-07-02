import { PrismaPg } from '@prisma/adapter-pg';
import {
  AssetClass,
  AssetSubClass,
  DataSource,
  PrismaClient,
  Type
} from '@prisma/client';

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL
});

const prisma = new PrismaClient({ adapter });

const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;
const PRICE_HISTORY_DAYS = 730;

function createSeededRandom(seed: number) {
  return () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

function getToday() {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return today;
}

function getDateDaysAgo(daysAgo: number) {
  return new Date(getToday().getTime() - daysAgo * ONE_DAY_IN_MS);
}

function generatePriceHistory({
  drift,
  seed,
  startPrice,
  volatility
}: {
  drift: number;
  seed: number;
  startPrice: number;
  volatility: number;
}) {
  const random = createSeededRandom(seed);
  let price = startPrice;
  const prices: { date: Date; price: number }[] = [];

  for (let daysAgo = PRICE_HISTORY_DAYS; daysAgo >= 0; daysAgo--) {
    price = Math.max(price * (1 + drift + (random() - 0.5) * volatility), 0.01);
    prices.push({
      date: getDateDaysAgo(daysAgo),
      price: Math.round(price * 100) / 100
    });
  }

  return prices;
}

function getPriceDaysAgo(
  priceHistory: { date: Date; price: number }[],
  daysAgo: number
) {
  const index = priceHistory.length - 1 - daysAgo;
  return priceHistory[Math.max(index, 0)].price;
}

async function seedTags() {
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
}

async function seedPortfolio() {
  const user = await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } });

  if (!user) {
    console.warn(
      'No user found. Sign in once to create a user, then run the seed again to add sample portfolio data.'
    );
    return;
  }

  const platformBrokerage = await prisma.platform.upsert({
    create: {
      id: '9fe1a2ce-b5b3-41c7-a61f-73d6c8c346f5',
      name: 'Interactive Brokers',
      url: 'https://www.interactivebrokers.com'
    },
    update: {},
    where: { url: 'https://www.interactivebrokers.com' }
  });

  const platformCrypto = await prisma.platform.upsert({
    create: {
      id: '1ef9a79a-61e6-4499-89eb-74b665cc8261',
      name: 'Binance',
      url: 'https://www.binance.com'
    },
    update: {},
    where: { url: 'https://www.binance.com' }
  });

  const accountBrokerageId = '6798f55e-b2b5-40ef-8270-7f245e4da4d1';
  const accountCryptoId = '0c660823-a36f-4903-9f24-71c6211399d8';

  await prisma.account.upsert({
    create: {
      id: accountBrokerageId,
      balance: 2500,
      currency: 'USD',
      name: 'Brokerage Account',
      platformId: platformBrokerage.id,
      userId: user.id
    },
    update: {},
    where: { id_userId: { id: accountBrokerageId, userId: user.id } }
  });

  await prisma.account.upsert({
    create: {
      id: accountCryptoId,
      balance: 500,
      currency: 'USD',
      name: 'Crypto Exchange',
      platformId: platformCrypto.id,
      userId: user.id
    },
    update: {},
    where: { id_userId: { id: accountCryptoId, userId: user.id } }
  });

  const symbols = {
    AAPL: {
      id: 'd7ae0976-9f0e-4a38-81a3-7cec78806436',
      symbol: 'AAPL.SEED',
      name: 'Apple Inc.',
      assetClass: AssetClass.EQUITY,
      assetSubClass: AssetSubClass.STOCK,
      priceHistory: generatePriceHistory({
        drift: 0.0006,
        seed: 1,
        startPrice: 150,
        volatility: 0.02
      })
    },
    MSFT: {
      id: '4c84f62e-20c5-4d5f-8d51-63221dc64c8a',
      symbol: 'MSFT.SEED',
      name: 'Microsoft Corporation',
      assetClass: AssetClass.EQUITY,
      assetSubClass: AssetSubClass.STOCK,
      priceHistory: generatePriceHistory({
        drift: 0.0007,
        seed: 2,
        startPrice: 300,
        volatility: 0.018
      })
    },
    VTI: {
      id: 'bc960e73-2ed5-4f46-82df-2a86595148e5',
      symbol: 'VTI.SEED',
      name: 'Vanguard Total Stock Market ETF',
      assetClass: AssetClass.EQUITY,
      assetSubClass: AssetSubClass.ETF,
      priceHistory: generatePriceHistory({
        drift: 0.0004,
        seed: 3,
        startPrice: 220,
        volatility: 0.01
      })
    },
    BTC: {
      id: 'f55270af-eb6c-4328-8411-71bf08f4803a',
      symbol: 'BTC.SEED',
      name: 'Bitcoin',
      assetClass: AssetClass.LIQUIDITY,
      assetSubClass: AssetSubClass.CRYPTOCURRENCY,
      priceHistory: generatePriceHistory({
        drift: 0.001,
        seed: 4,
        startPrice: 28000,
        volatility: 0.04
      })
    }
  } as const;

  const custodyFeeProfileId = 'e9cec288-3486-4f12-9dc5-9a57f3883b43';
  const custodyFeeSymbol = '2160cb24-5906-499e-b854-9c7278cb35b1';

  for (const {
    id,
    symbol,
    name,
    assetClass,
    assetSubClass,
    priceHistory
  } of Object.values(symbols)) {
    await prisma.symbolProfile.upsert({
      create: {
        id,
        symbol,
        assetClass,
        assetSubClass,
        currency: 'USD',
        dataSource: DataSource.MANUAL,
        name,
        userId: user.id
      },
      update: {},
      where: { dataSource_symbol: { dataSource: DataSource.MANUAL, symbol } }
    });

    await prisma.marketData.createMany({
      data: priceHistory.map(({ date, price }) => {
        return {
          date,
          dataSource: DataSource.MANUAL,
          marketPrice: price,
          symbol
        };
      }),
      skipDuplicates: true
    });
  }

  await prisma.symbolProfile.upsert({
    create: {
      id: custodyFeeProfileId,
      symbol: custodyFeeSymbol,
      currency: 'USD',
      dataSource: DataSource.MANUAL,
      name: 'Custody Fee',
      userId: user.id
    },
    update: {},
    where: {
      dataSource_symbol: {
        dataSource: DataSource.MANUAL,
        symbol: custodyFeeSymbol
      }
    }
  });

  const orders: {
    id: string;
    accountId: string;
    symbolProfileId: string;
    type: Type;
    daysAgo: number;
    quantity: number;
    fee: number;
    unitPrice?: number;
  }[] = [
    {
      id: 'bbe70675-1ff7-48e2-9af3-99e2c9bf01ba',
      accountId: accountBrokerageId,
      symbolProfileId: symbols.AAPL.id,
      type: Type.BUY,
      daysAgo: 700,
      quantity: 20,
      fee: 4.95
    },
    {
      id: '15aa3ddc-4212-4a54-83fa-f2fad8791dfd',
      accountId: accountBrokerageId,
      symbolProfileId: symbols.MSFT.id,
      type: Type.BUY,
      daysAgo: 650,
      quantity: 10,
      fee: 4.95
    },
    {
      id: '7a7c2607-20a2-4f00-a0ff-7ae2f85f2ff3',
      accountId: accountBrokerageId,
      symbolProfileId: symbols.VTI.id,
      type: Type.BUY,
      daysAgo: 600,
      quantity: 15,
      fee: 0
    },
    {
      id: '46c66fe3-f12c-40d1-bb6d-8e1eee9b115f',
      accountId: accountBrokerageId,
      symbolProfileId: symbols.AAPL.id,
      type: Type.BUY,
      daysAgo: 400,
      quantity: 10,
      fee: 4.95
    },
    {
      id: '5f835cc2-f7da-481c-8043-7011074f5045',
      accountId: accountBrokerageId,
      symbolProfileId: symbols.VTI.id,
      type: Type.BUY,
      daysAgo: 300,
      quantity: 15,
      fee: 0
    },
    {
      id: '98d0d61c-ab30-49d1-b57c-629930a140bf',
      accountId: accountBrokerageId,
      symbolProfileId: symbols.MSFT.id,
      type: Type.DIVIDEND,
      daysAgo: 200,
      quantity: 1,
      fee: 0,
      unitPrice: 18.5
    },
    {
      id: 'ce733963-672a-4569-880a-7fc92de8baa5',
      accountId: accountBrokerageId,
      symbolProfileId: symbols.MSFT.id,
      type: Type.BUY,
      daysAgo: 150,
      quantity: 5,
      fee: 4.95
    },
    {
      id: 'f82b04dd-ab56-4061-a67e-2fabd0303068',
      accountId: accountBrokerageId,
      symbolProfileId: symbols.AAPL.id,
      type: Type.DIVIDEND,
      daysAgo: 100,
      quantity: 1,
      fee: 0,
      unitPrice: 9.6
    },
    {
      id: '1b49f226-89bf-41e2-8613-3446e3722b34',
      accountId: accountBrokerageId,
      symbolProfileId: custodyFeeProfileId,
      type: Type.FEE,
      daysAgo: 90,
      quantity: 1,
      fee: 0,
      unitPrice: 5
    },
    {
      id: 'ca5ef988-3595-4d76-b9b1-19541ebf4fad',
      accountId: accountBrokerageId,
      symbolProfileId: symbols.AAPL.id,
      type: Type.BUY,
      daysAgo: 50,
      quantity: 5,
      fee: 4.95
    },
    {
      id: '8352549c-68a0-4c9f-b4d3-910970219c0b',
      accountId: accountCryptoId,
      symbolProfileId: symbols.BTC.id,
      type: Type.BUY,
      daysAgo: 500,
      quantity: 0.05,
      fee: 10
    },
    {
      id: 'c8f9bcda-215e-4a63-af43-a47de6517fcf',
      accountId: accountCryptoId,
      symbolProfileId: symbols.BTC.id,
      type: Type.BUY,
      daysAgo: 300,
      quantity: 0.03,
      fee: 8
    },
    {
      id: '75dfaa3d-e73d-4a73-a2ef-d5cc98243b4f',
      accountId: accountCryptoId,
      symbolProfileId: symbols.BTC.id,
      type: Type.BUY,
      daysAgo: 100,
      quantity: 0.02,
      fee: 5
    },
    {
      id: '7adf12c3-839c-4a0d-872d-13083a9b84b7',
      accountId: accountCryptoId,
      symbolProfileId: symbols.BTC.id,
      type: Type.SELL,
      daysAgo: 30,
      quantity: 0.01,
      fee: 5
    }
  ];

  const priceHistoryBySymbolProfileId = Object.fromEntries(
    Object.values(symbols).map(({ id, priceHistory }) => [id, priceHistory])
  );

  for (const order of orders) {
    const unitPrice =
      order.unitPrice ??
      getPriceDaysAgo(
        priceHistoryBySymbolProfileId[order.symbolProfileId],
        order.daysAgo
      );

    const data = {
      accountId: order.accountId,
      accountUserId: user.id,
      currency: 'USD',
      date: getDateDaysAgo(order.daysAgo),
      fee: order.fee,
      isDraft: false,
      quantity: order.quantity,
      symbolProfileId: order.symbolProfileId,
      type: order.type,
      unitPrice,
      userId: user.id
    };

    await prisma.order.upsert({
      create: { id: order.id, ...data },
      update: data,
      where: { id: order.id }
    });
  }

  console.log(
    `Seeded sample portfolio data for user ${user.id} (2 accounts, ${Object.keys(symbols).length} symbols, ${orders.length} activities).`
  );
}

async function main() {
  await seedTags();
  await seedPortfolio();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
