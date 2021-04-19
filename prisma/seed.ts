import { Currency, PrismaClient, Role, Type } from '@prisma/client';
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
      alias: 'Demo',
      id: '9b112b4d-3b7d-4bad-9bdd-3b0f7b4dac2f',
      role: Role.DEMO,
      Order: {
        create: [
          {
            currency: Currency.USD,
            date: new Date(Date.UTC(2017, 0, 3, 0, 0, 0)),
            fee: 30,
            id: 'cf7c0418-8535-4089-ae3d-5dbfa0aec2e1',
            platformId: platformDegiro.id,
            quantity: 50,
            symbol: 'TSLA',
            type: Type.BUY,
            unitPrice: 42.97
          },
          {
            currency: Currency.USD,
            date: new Date(Date.UTC(2017, 7, 16, 0, 0, 0)),
            fee: 29.9,
            id: 'a1c5d73a-8631-44e5-ac44-356827a5212c',
            platformId: platformCoinbase.id,
            quantity: 0.5614682,
            symbol: 'BTCUSD',
            type: Type.BUY,
            unitPrice: 3562.089535970158
          },
          {
            currency: Currency.USD,
            date: new Date(Date.UTC(2018, 9, 1, 0, 0, 0)),
            fee: 80.79,
            id: '71c08e2a-4a86-44ae-a890-c337de5d5f9b',
            platformId: platformInteractiveBrokers.id,
            quantity: 5,
            symbol: 'AMZN',
            type: Type.BUY,
            unitPrice: 2021.99
          },
          {
            currency: Currency.USD,
            date: new Date(Date.UTC(2019, 2, 1, 0, 0, 0)),
            fee: 19.9,
            id: '385f2c2c-d53e-4937-b0e5-e92ef6020d4e',
            platformId: platformInteractiveBrokers.id,
            quantity: 10,
            symbol: 'VTI',
            type: Type.BUY,
            unitPrice: 144.38
          },
          {
            currency: Currency.USD,
            date: new Date(Date.UTC(2019, 8, 3, 0, 0, 0)),
            fee: 19.9,
            id: '185f2c2c-d53e-4937-b0e5-a93ef6020d4e',
            platformId: platformInteractiveBrokers.id,
            quantity: 10,
            symbol: 'VTI',
            type: Type.BUY,
            unitPrice: 147.99
          },
          {
            currency: Currency.USD,
            date: new Date(Date.UTC(2020, 2, 2, 0, 0, 0)),
            fee: 19.9,
            id: '347b0430-a84f-4031-a0f9-390399066ad6',
            platformId: platformInteractiveBrokers.id,
            quantity: 10,
            symbol: 'VTI',
            type: Type.BUY,
            unitPrice: 151.41
          },
          {
            currency: Currency.USD,
            date: new Date(Date.UTC(2020, 8, 1, 0, 0, 0)),
            fee: 19.9,
            id: '67ec3f47-3189-4b63-ba05-60d3a06b302f',
            platformId: platformInteractiveBrokers.id,
            quantity: 10,
            symbol: 'VTI',
            type: Type.BUY,
            unitPrice: 177.69
          },
          {
            currency: Currency.USD,
            date: new Date(Date.UTC(2020, 2, 1, 0, 0, 0)),
            fee: 19.9,
            id: 'd01c6fbc-fa8d-47e6-8e80-66f882d2bfd2',
            platformId: platformInteractiveBrokers.id,
            quantity: 10,
            symbol: 'VTI',
            type: Type.BUY,
            unitPrice: 203.15
          }
        ]
      }
    },
    update: {},
    where: { id: '9b112b4d-3b7d-4bad-9bdd-3b0f7b4dac2f' }
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
