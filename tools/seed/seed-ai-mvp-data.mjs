import { PrismaClient, Provider, Role, Type } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_ACCESS_TOKEN = 'mvp-ai-demo-token';
const PRIMARY_ACCOUNT_NAME = 'MVP Portfolio';
const SECONDARY_ACCOUNT_NAME = 'Income Portfolio';
const SEED_COMMENT_PREFIX = 'ai-mvp-seed:';
const DEFAULT_SETTINGS = {
  baseCurrency: 'USD',
  benchmark: 'SPY',
  dateRange: 'max',
  isExperimentalFeatures: true,
  language: 'en',
  locale: 'en-US'
};

const SEED_TRANSACTIONS = [
  {
    accountName: PRIMARY_ACCOUNT_NAME,
    date: '2024-01-15T00:00:00.000Z',
    name: 'Apple Inc.',
    seedKey: 'mvp-aapl-buy-20240115',
    quantity: 8,
    symbol: 'AAPL',
    type: Type.BUY,
    unitPrice: 186.2
  },
  {
    accountName: PRIMARY_ACCOUNT_NAME,
    date: '2024-03-01T00:00:00.000Z',
    name: 'Microsoft Corporation',
    seedKey: 'mvp-msft-buy-20240301',
    quantity: 5,
    symbol: 'MSFT',
    type: Type.BUY,
    unitPrice: 410.5
  },
  {
    accountName: PRIMARY_ACCOUNT_NAME,
    date: '2024-04-10T00:00:00.000Z',
    name: 'Tesla, Inc.',
    seedKey: 'mvp-tsla-buy-20240410',
    quantity: 6,
    symbol: 'TSLA',
    type: Type.BUY,
    unitPrice: 175.15
  },
  {
    accountName: PRIMARY_ACCOUNT_NAME,
    date: '2024-05-20T00:00:00.000Z',
    name: 'NVIDIA Corporation',
    seedKey: 'mvp-nvda-buy-20240520',
    quantity: 4,
    symbol: 'NVDA',
    type: Type.BUY,
    unitPrice: 892.5
  },
  {
    accountName: PRIMARY_ACCOUNT_NAME,
    date: '2024-09-03T00:00:00.000Z',
    name: 'Apple Inc.',
    seedKey: 'mvp-aapl-sell-20240903',
    quantity: 2,
    symbol: 'AAPL',
    type: Type.SELL,
    unitPrice: 222.4
  },
  {
    accountName: PRIMARY_ACCOUNT_NAME,
    date: '2024-11-15T00:00:00.000Z',
    name: 'Tesla, Inc.',
    seedKey: 'mvp-tsla-sell-20241115',
    quantity: 1,
    symbol: 'TSLA',
    type: Type.SELL,
    unitPrice: 248.75
  },
  {
    accountName: SECONDARY_ACCOUNT_NAME,
    date: '2024-02-01T00:00:00.000Z',
    name: 'Vanguard Total Stock Market ETF',
    seedKey: 'income-vti-buy-20240201',
    quantity: 12,
    symbol: 'VTI',
    type: Type.BUY,
    unitPrice: 242.3
  },
  {
    accountName: SECONDARY_ACCOUNT_NAME,
    date: '2024-03-18T00:00:00.000Z',
    name: 'Schwab U.S. Dividend Equity ETF',
    seedKey: 'income-schd-buy-20240318',
    quantity: 16,
    symbol: 'SCHD',
    type: Type.BUY,
    unitPrice: 77.85
  },
  {
    accountName: SECONDARY_ACCOUNT_NAME,
    date: '2024-06-03T00:00:00.000Z',
    name: 'Johnson & Johnson',
    seedKey: 'income-jnj-buy-20240603',
    quantity: 7,
    symbol: 'JNJ',
    type: Type.BUY,
    unitPrice: 148.2
  },
  {
    accountName: SECONDARY_ACCOUNT_NAME,
    date: '2024-07-08T00:00:00.000Z',
    name: 'Coca-Cola Company',
    seedKey: 'income-ko-buy-20240708',
    quantity: 10,
    symbol: 'KO',
    type: Type.BUY,
    unitPrice: 61.4
  },
  {
    accountName: SECONDARY_ACCOUNT_NAME,
    date: '2024-12-04T00:00:00.000Z',
    name: 'Schwab U.S. Dividend Equity ETF',
    seedKey: 'income-schd-sell-20241204',
    quantity: 4,
    symbol: 'SCHD',
    type: Type.SELL,
    unitPrice: 80.95
  },
  {
    accountName: SECONDARY_ACCOUNT_NAME,
    date: '2025-01-14T00:00:00.000Z',
    name: 'Vanguard Total Stock Market ETF',
    seedKey: 'income-vti-buy-20250114',
    quantity: 6,
    symbol: 'VTI',
    type: Type.BUY,
    unitPrice: 258.1
  }
];

async function ensureUsers() {
  const existingUsers = await prisma.user.findMany({
    include: {
      settings: true
    },
    orderBy: {
      createdAt: 'asc'
    }
  });

  if (existingUsers.length === 0) {
    const createdUser = await prisma.user.create({
      data: {
        accessToken: DEFAULT_ACCESS_TOKEN,
        provider: Provider.ANONYMOUS,
        role: Role.ADMIN,
        settings: {
          create: {
            settings: DEFAULT_SETTINGS
          }
        }
      }
    });

    return [createdUser.id];
  }

  for (const user of existingUsers) {
    if (!user.accessToken) {
      await prisma.user.update({
        data: {
          accessToken: DEFAULT_ACCESS_TOKEN
        },
        where: {
          id: user.id
        }
      });
    }

    if (!user.settings) {
      await prisma.settings.create({
        data: {
          settings: DEFAULT_SETTINGS,
          userId: user.id
        }
      });
    } else {
      await prisma.settings.update({
        data: {
          settings: {
            ...(user.settings.settings ?? {}),
            isExperimentalFeatures: true
          }
        },
        where: {
          userId: user.id
        }
      });
    }
  }

  return existingUsers.map(({ id }) => id);
}

async function buildSeedResult({ perUserResults }) {
  const orderedResults = perUserResults.sort((a, b) => {
    return a.userId.localeCompare(b.userId);
  });
  const primaryUserResult = orderedResults[0];
  const primaryUser = primaryUserResult
    ? await prisma.user.findUnique({
        where: {
          id: primaryUserResult.userId
        }
      })
    : undefined;

  return {
    createdOrders: orderedResults.reduce((acc, current) => {
      return acc + current.createdOrders;
    }, 0),
    existingSeedOrders: orderedResults.reduce((acc, current) => {
      return acc + current.existingSeedOrders;
    }, 0),
    message:
      'AI MVP data is ready. Use /portfolio/analysis and /portfolio/activities to test.',
    perUserResults: orderedResults,
    seededUsers: orderedResults.length,
    userAccessToken: primaryUser?.accessToken ?? DEFAULT_ACCESS_TOKEN
  };
}

async function main() {
  const userIds = await ensureUsers();
  const perUserResults = [];
  const accountNames = [...new Set(SEED_TRANSACTIONS.map(({ accountName }) => {
    return accountName;
  }))];

  for (const userId of userIds) {
    const accountsByName = {};

    for (const accountName of accountNames) {
      accountsByName[accountName] = await ensureAccount({
        accountName,
        userId
      });
    }

    const { createdOrders, existingSeedOrders } = await ensurePositions({
      accountsByName,
      userId
    });

    perUserResults.push({
      accounts: Object.values(accountsByName).map(({ id, name }) => {
        return { accountId: id, accountName: name };
      }),
      createdOrders,
      existingSeedOrders,
      userId
    });
  }

  const result = await buildSeedResult({
    perUserResults
  });

  console.log(JSON.stringify(result, null, 2));
}

async function ensureAccount({ accountName, userId }) {
  const existingNamedAccount = await prisma.account.findFirst({
    where: {
      name: accountName,
      userId
    }
  });

  if (existingNamedAccount) {
    if (existingNamedAccount.currency) {
      return existingNamedAccount;
    }

    return prisma.account.update({
      data: {
        currency: 'USD'
      },
      where: {
        id_userId: {
          id: existingNamedAccount.id,
          userId
        }
      }
    });
  }

  if (accountName === PRIMARY_ACCOUNT_NAME) {
    const fallbackAccount = await prisma.account.findFirst({
      orderBy: {
        createdAt: 'asc'
      },
      where: {
        userId
      }
    });

    if (fallbackAccount) {
      return prisma.account.update({
        data: {
          currency: fallbackAccount.currency ?? 'USD',
          name: accountName
        },
        where: {
          id_userId: {
            id: fallbackAccount.id,
            userId
          }
        }
      });
    }
  }

  return prisma.account.create({
    data: {
      currency: 'USD',
      name: accountName,
      userId
    }
  });
}

async function ensurePositions({ accountsByName, userId }) {
  let createdCount = 0;

  for (const transaction of SEED_TRANSACTIONS) {
    const account = accountsByName[transaction.accountName];

    if (!account) {
      throw new Error(`Missing account mapping for ${transaction.accountName}`);
    }

    const symbolProfile = await prisma.symbolProfile.upsert({
      create: {
        assetClass: 'EQUITY',
        assetSubClass:
          transaction.symbol.endsWith('ETF') || ['VTI', 'SCHD'].includes(transaction.symbol)
            ? 'ETF'
            : 'STOCK',
        currency: 'USD',
        dataSource: 'YAHOO',
        name: transaction.name,
        symbol: transaction.symbol
      },
      update: {
        assetClass: 'EQUITY',
        assetSubClass:
          transaction.symbol.endsWith('ETF') || ['VTI', 'SCHD'].includes(transaction.symbol)
            ? 'ETF'
            : 'STOCK',
        currency: 'USD',
        isActive: true,
        name: transaction.name
      },
      where: {
        dataSource_symbol: {
          dataSource: 'YAHOO',
          symbol: transaction.symbol
        }
      }
    });

    const seedComment = `${SEED_COMMENT_PREFIX}${transaction.seedKey}`;
    const existingOrder = await prisma.order.findFirst({
      where: {
        comment: seedComment,
        userId
      }
    });

    if (!existingOrder) {
      await prisma.order.create({
        data: {
          accountId: account.id,
          accountUserId: userId,
          comment: seedComment,
          currency: 'USD',
          date: new Date(transaction.date),
          fee: 1,
          quantity: transaction.quantity,
          symbolProfileId: symbolProfile.id,
          type: transaction.type,
          unitPrice: transaction.unitPrice,
          userId
        }
      });

      createdCount += 1;
    }
  }

  const existingSeedOrders = await prisma.order.count({
    where: {
      comment: {
        startsWith: SEED_COMMENT_PREFIX
      },
      userId
    }
  });

  return { createdOrders: createdCount, existingSeedOrders };
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
