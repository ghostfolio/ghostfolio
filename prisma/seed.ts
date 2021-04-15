import { Currency, PrismaClient, Role, Type } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.upsert({
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

  const demo = await prisma.user.upsert({
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
            quantity: 50,
            symbol: 'TSLA',
            type: Type.BUY,
            unitPrice: 42.97
          }
        ]
      }
    },
    update: {},
    where: { id: '9b112b4d-3b7d-4bad-9bdd-3b0f7b4dac2f' }
  });

  console.log({ admin, demo });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
