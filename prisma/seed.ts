import {
  AccountType,
  DataSource,
  PrismaClient,
  Role,
  Type
} from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const platformBitcoinSuisse = await prisma.platform.upsert({
    create: {
      id: '70b6e475-a2b9-4527-99db-943e4f38ce45',
      name: 'Bitcoin Suisse',
      url: 'https://www.bitcoinsuisse.com'
    },
    update: {},
    where: { id: '70b6e475-a2b9-4527-99db-943e4f38ce45' }
  });

  const platformBitpanda = await prisma.platform.upsert({
    create: {
      id: 'debf9110-498f-4811-b972-7ebbd317e730',
      name: 'Bitpanda',
      url: 'https://www.bitpanda.com'
    },
    update: {},
    where: { id: 'debf9110-498f-4811-b972-7ebbd317e730' }
  });

  const platformCoinbase = await prisma.platform.upsert({
    create: {
      id: '8dc24b88-bb92-4152-af25-fe6a31643e26',
      name: 'Coinbase',
      url: 'https://www.coinbase.com'
    },
    update: {},
    where: { id: '8dc24b88-bb92-4152-af25-fe6a31643e26' }
  });

  const platformDegiro = await prisma.platform.upsert({
    create: {
      id: '94c1a2f4-a666-47be-84cd-4c8952e74c81',
      name: 'DEGIRO',
      url: 'https://www.degiro.eu'
    },
    update: {},
    where: { id: '94c1a2f4-a666-47be-84cd-4c8952e74c81' }
  });

  const platformInteractiveBrokers = await prisma.platform.upsert({
    create: {
      id: '9da3a8a7-4795-43e3-a6db-ccb914189737',
      name: 'Interactive Brokers',
      url: 'https://www.interactivebrokers.com'
    },
    update: {},
    where: { id: '9da3a8a7-4795-43e3-a6db-ccb914189737' }
  });

  const platformPostFinance = await prisma.platform.upsert({
    create: {
      id: '5377d9df-0d25-42c2-9d9b-e4c63166281e',
      name: 'PostFinance',
      url: 'https://www.postfinance.ch'
    },
    update: {},
    where: { id: '5377d9df-0d25-42c2-9d9b-e4c63166281e' }
  });

  const platformSwissquote = await prisma.platform.upsert({
    create: {
      id: '1377d9df-0d25-42c2-9d9b-e4c63156291f',
      name: 'Swissquote',
      url: 'https://swissquote.com'
    },
    update: {},
    where: { id: '1377d9df-0d25-42c2-9d9b-e4c63156291f' }
  });

  const userAdmin = await prisma.user.upsert({
    create: {
      accessToken:
        'c689bcc894e4a420cb609ee34271f3e07f200594f7d199c50d75add7102889eb60061a04cd2792ebc853c54e37308271271e7bf588657c9e0c37faacbc28c3c6',
      Account: {
        create: [
          {
            accountType: AccountType.SECURITIES,
            balance: 0,
            currency: 'USD',
            id: 'f4425b66-9ba9-4ac4-93d7-fdf9a145e8cb',
            isDefault: true,
            name: 'Default Account'
          }
        ]
      },
      alias: 'Admin',
      id: '4e1af723-95f6-44f8-92a7-464df17f6ec3',
      role: Role.ADMIN
    },
    update: {},
    where: { id: '4e1af723-95f6-44f8-92a7-464df17f6ec3' }
  });

  const userDemo = await prisma.user.upsert({
    create: {
      accessToken:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliMTEyYjRkLTNiN2QtNGJhZC05YmRkLTNiMGY3YjRkYWMyZiIsImlhdCI6MTYxODUxMjAxNCwiZXhwIjoxNjIxMTA0MDE0fQ.l3WUxpI0hxuQtdPrD0kd7sem6S2kx_7CrdNvkmlKuWw',
      Account: {
        create: [
          {
            accountType: AccountType.SECURITIES,
            balance: 0,
            currency: 'USD',
            id: 'd804de69-0429-42dc-b6ca-b308fd7dd926',
            name: 'Coinbase Account',
            platformId: platformCoinbase.id
          },
          {
            accountType: AccountType.SECURITIES,
            balance: 0,
            currency: 'EUR',
            id: '65cfb79d-b6c7-4591-9d46-73426bc62094',
            name: 'DEGIRO Account',
            platformId: platformDegiro.id
          },
          {
            accountType: AccountType.SECURITIES,
            balance: 0,
            currency: 'USD',
            id: '480269ce-e12a-4fd1-ac88-c4b0ff3f899c',
            isDefault: true,
            name: 'Interactive Brokers Account',
            platformId: platformInteractiveBrokers.id
          }
        ]
      },
      alias: 'Demo',
      id: '9b112b4d-3b7d-4bad-9bdd-3b0f7b4dac2f',
      role: Role.DEMO
    },
    update: {},
    where: { id: '9b112b4d-3b7d-4bad-9bdd-3b0f7b4dac2f' }
  });

  await prisma.symbolProfile.createMany({
    data: [
      {
        countries: [{ code: 'US', weight: 1 }],
        dataSource: DataSource.YAHOO,
        id: '2bd26362-136e-411c-b578-334084b4cdcc',
        sectors: [{ name: 'Consumer Cyclical', weight: 1 }],
        symbol: 'AMZN'
      },
      {
        countries: null,
        dataSource: DataSource.YAHOO,
        id: 'fdc42ea6-1321-44f5-9fb0-d7f1f2cf9b1e',
        sectors: null,
        symbol: 'BTCUSD'
      },
      {
        countries: [{ code: 'US', weight: 1 }],
        dataSource: DataSource.YAHOO,
        id: 'd1ee9681-fb21-4f99-a3b7-afd4fc04df2e',
        sectors: [{ name: 'Consumer Cyclical', weight: 1 }],
        symbol: 'TSLA'
      },
      {
        countries: [
          { code: 'US', weight: 0.9886789999999981 },
          { code: 'NL', weight: 0.000203 },
          { code: 'CA', weight: 0.000362 }
        ],
        dataSource: DataSource.YAHOO,
        id: '7d9c8540-061e-4e7e-b019-0d0f4a84e796',
        sectors: [
          { name: 'Technology', weight: 0.31393799999999955 },
          { name: 'Consumer Cyclical', weight: 0.149224 },
          { name: 'Financials', weight: 0.11716100000000002 },
          { name: 'Healthcare', weight: 0.13285199999999994 },
          { name: 'Consumer Staples', weight: 0.053919000000000016 },
          { name: 'Energy', weight: 0.025529999999999997 },
          { name: 'Telecommunications', weight: 0.012579 },
          { name: 'Industrials', weight: 0.09526399999999995 },
          { name: 'Utilities', weight: 0.024791999999999988 },
          { name: 'Materials', weight: 0.027664 },
          { name: 'Real Estate', weight: 0.03239999999999998 },
          { name: 'Communication', weight: 0.0036139999999999996 },
          { name: 'Other', weight: 0.000218 }
        ],
        symbol: 'VTI'
      }
    ],
    skipDuplicates: true
  });

  await prisma.order.createMany({
    data: [
      {
        accountId: '65cfb79d-b6c7-4591-9d46-73426bc62094',
        accountUserId: userDemo.id,
        currency: 'USD',
        dataSource: DataSource.YAHOO,
        date: new Date(Date.UTC(2017, 0, 3, 0, 0, 0)),
        fee: 30,
        id: 'cf7c0418-8535-4089-ae3d-5dbfa0aec2e1',
        quantity: 50,
        symbol: 'TSLA',
        symbolProfileId: 'd1ee9681-fb21-4f99-a3b7-afd4fc04df2e',
        type: Type.BUY,
        unitPrice: 42.97,
        userId: userDemo.id
      },
      {
        accountId: 'd804de69-0429-42dc-b6ca-b308fd7dd926',
        accountUserId: userDemo.id,
        currency: 'USD',
        dataSource: DataSource.YAHOO,
        date: new Date(Date.UTC(2017, 7, 16, 0, 0, 0)),
        fee: 29.9,
        id: 'a1c5d73a-8631-44e5-ac44-356827a5212c',
        quantity: 0.5614682,
        symbol: 'BTCUSD',
        symbolProfileId: 'fdc42ea6-1321-44f5-9fb0-d7f1f2cf9b1e',
        type: Type.BUY,
        unitPrice: 3562.089535970158,
        userId: userDemo.id
      },
      {
        accountId: '480269ce-e12a-4fd1-ac88-c4b0ff3f899c',
        accountUserId: userDemo.id,
        currency: 'USD',
        dataSource: DataSource.YAHOO,
        date: new Date(Date.UTC(2018, 9, 1, 0, 0, 0)),
        fee: 80.79,
        id: '71c08e2a-4a86-44ae-a890-c337de5d5f9b',
        quantity: 5,
        symbol: 'AMZN',
        symbolProfileId: '2bd26362-136e-411c-b578-334084b4cdcc',
        type: Type.BUY,
        unitPrice: 2021.99,
        userId: userDemo.id
      },
      {
        accountId: '480269ce-e12a-4fd1-ac88-c4b0ff3f899c',
        accountUserId: userDemo.id,
        currency: 'USD',
        dataSource: DataSource.YAHOO,
        date: new Date(Date.UTC(2019, 2, 1, 0, 0, 0)),
        fee: 19.9,
        id: '385f2c2c-d53e-4937-b0e5-e92ef6020d4e',
        quantity: 10,
        symbol: 'VTI',
        symbolProfileId: '7d9c8540-061e-4e7e-b019-0d0f4a84e796',
        type: Type.BUY,
        unitPrice: 144.38,
        userId: userDemo.id
      },
      {
        accountId: '480269ce-e12a-4fd1-ac88-c4b0ff3f899c',
        accountUserId: userDemo.id,
        currency: 'USD',
        dataSource: DataSource.YAHOO,
        date: new Date(Date.UTC(2019, 8, 3, 0, 0, 0)),
        fee: 19.9,
        id: '185f2c2c-d53e-4937-b0e5-a93ef6020d4e',
        quantity: 10,
        symbol: 'VTI',
        symbolProfileId: '7d9c8540-061e-4e7e-b019-0d0f4a84e796',
        type: Type.BUY,
        unitPrice: 147.99,
        userId: userDemo.id
      },
      {
        accountId: '480269ce-e12a-4fd1-ac88-c4b0ff3f899c',
        accountUserId: userDemo.id,
        currency: 'USD',
        dataSource: DataSource.YAHOO,
        date: new Date(Date.UTC(2020, 2, 2, 0, 0, 0)),
        fee: 19.9,
        id: '347b0430-a84f-4031-a0f9-390399066ad6',
        quantity: 10,
        symbol: 'VTI',
        symbolProfileId: '7d9c8540-061e-4e7e-b019-0d0f4a84e796',
        type: Type.BUY,
        unitPrice: 151.41,
        userId: userDemo.id
      },
      {
        accountId: '480269ce-e12a-4fd1-ac88-c4b0ff3f899c',
        accountUserId: userDemo.id,
        currency: 'USD',
        dataSource: DataSource.YAHOO,
        date: new Date(Date.UTC(2020, 8, 1, 0, 0, 0)),
        fee: 19.9,
        id: '67ec3f47-3189-4b63-ba05-60d3a06b302f',
        quantity: 10,
        symbol: 'VTI',
        symbolProfileId: '7d9c8540-061e-4e7e-b019-0d0f4a84e796',
        type: Type.BUY,
        unitPrice: 177.69,
        userId: userDemo.id
      },
      {
        accountId: '480269ce-e12a-4fd1-ac88-c4b0ff3f899c',
        accountUserId: userDemo.id,
        currency: 'USD',
        dataSource: DataSource.YAHOO,
        date: new Date(Date.UTC(2020, 2, 1, 0, 0, 0)),
        fee: 19.9,
        id: 'd01c6fbc-fa8d-47e6-8e80-66f882d2bfd2',
        quantity: 10,
        symbol: 'VTI',
        symbolProfileId: '7d9c8540-061e-4e7e-b019-0d0f4a84e796',
        type: Type.BUY,
        unitPrice: 203.15,
        userId: userDemo.id
      }
    ],
    skipDuplicates: true
  });

  console.log({
    platformBitcoinSuisse,
    platformBitpanda,
    platformCoinbase,
    platformDegiro,
    platformInteractiveBrokers,
    platformPostFinance,
    platformSwissquote,
    userAdmin,
    userDemo
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
