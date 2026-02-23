#!/usr/bin/env node

/**
 * Agent setup helper: configures OpenRouter API key, model, and demo user.
 *
 * Usage:
 *   export DATABASE_URL="postgresql://user:ghostfolio-pg-dev@localhost:5432/ghostfolio-db?connect_timeout=300&sslmode=prefer"
 *   node scripts/agent-setup.mjs --openrouter-key=sk-or-... [--model=anthropic/claude-sonnet-4-20250514]
 */

import { PrismaClient } from '@prisma/client';
import { createHmac, randomBytes } from 'crypto';

const prisma = new PrismaClient();

function getArg(name) {
  const prefix = `--${name}=`;
  const arg = process.argv.find((a) => a.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : undefined;
}

async function main() {
  const openRouterKey = getArg('openrouter-key');
  const model = getArg('model') || 'openai/gpt-4o-mini';
  const salt = process.env.ACCESS_TOKEN_SALT || 'agentforge-dev-salt-2026';

  if (!openRouterKey) {
    console.error('Usage: node scripts/agent-setup.mjs --openrouter-key=sk-or-...');
    process.exit(1);
  }

  await prisma.property.upsert({
    where: { key: 'API_KEY_OPENROUTER' },
    update: { value: openRouterKey },
    create: { key: 'API_KEY_OPENROUTER', value: openRouterKey }
  });
  console.log(`Set API_KEY_OPENROUTER`);

  await prisma.property.upsert({
    where: { key: 'OPENROUTER_MODEL' },
    update: { value: model },
    create: { key: 'OPENROUTER_MODEL', value: model }
  });
  console.log(`Set OPENROUTER_MODEL = ${model}`);

  let user = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!user) {
    const securityToken = 'agentforge-demo-token';
    const hash = createHmac('sha512', salt);
    hash.update(securityToken);
    const hashedToken = hash.digest('hex');

    user = await prisma.user.create({
      data: {
        accessToken: hashedToken,
        role: 'ADMIN',
        provider: 'ANONYMOUS',
        settings: {
          create: {
            settings: { baseCurrency: 'USD', locale: 'en-US', language: 'en' }
          }
        }
      }
    });

    const account = await prisma.account.create({
      data: { name: 'Demo Account', userId: user.id, balance: 10000, currency: 'USD' }
    });

    for (const { symbol, name, subClass, qty, price, date } of [
      { symbol: 'AAPL', name: 'Apple Inc.', subClass: 'STOCK', qty: 10, price: 185.50, date: '2025-01-15' },
      { symbol: 'MSFT', name: 'Microsoft Corporation', subClass: 'STOCK', qty: 5, price: 405.00, date: '2025-02-01' },
      { symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', subClass: 'ETF', qty: 20, price: 240.00, date: '2025-03-10' }
    ]) {
      let sp = await prisma.symbolProfile.findFirst({ where: { symbol, dataSource: 'YAHOO' } });
      if (!sp) {
        sp = await prisma.symbolProfile.create({
          data: { symbol, dataSource: 'YAHOO', currency: 'USD', name, assetClass: 'EQUITY', assetSubClass: subClass }
        });
      }
      await prisma.order.create({
        data: {
          userId: user.id,
          accountId: account.id,
          symbolProfileId: sp.id,
          date: new Date(date),
          fee: 0,
          quantity: qty,
          type: 'BUY',
          unitPrice: price
        }
      });
    }
    console.log(`Created ADMIN user (id: ${user.id}) with demo portfolio (AAPL, MSFT, VTI)`);
    console.log(`Security token: agentforge-demo-token`);
  } else {
    console.log(`ADMIN user already exists (id: ${user.id})`);
  }

  console.log('\nSetup complete! Start the API with:');
  console.log('  npx nx serve api');
  console.log('\nThen open: http://localhost:3333/api/v1/agent/chat');
  console.log('Enter security token: agentforge-demo-token');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
