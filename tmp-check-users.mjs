import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

// Delete all data in dependency order
await p.access.deleteMany();
await p.order.deleteMany();
await p.accountBalance.deleteMany();
await p.account.deleteMany();
await p.symbolProfile.deleteMany();
await p.marketData.deleteMany();
await p.settings.deleteMany();
await p.subscription.deleteMany();
await p.authDevice.deleteMany();
await p.analytics.deleteMany();
await p.user.deleteMany();

console.log('All users deleted.');

const users = await p.user.findMany({ select: { id: true, role: true } });
console.log('USERS after delete:', JSON.stringify(users));
await p.$disconnect();
