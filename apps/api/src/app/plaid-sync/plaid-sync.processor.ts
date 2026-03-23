import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { PLAID_SYNC_QUEUE } from '@ghostfolio/common/config';

import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Job } from 'bull';
import {
  Configuration,
  PlaidApi,
  PlaidEnvironments
} from 'plaid';
import * as crypto from 'crypto';

@Processor(PLAID_SYNC_QUEUE)
export class PlaidSyncProcessor {
  private readonly logger = new Logger(PlaidSyncProcessor.name);
  private plaidClient: PlaidApi;

  public constructor(
    private readonly configurationService: ConfigurationService,
    private readonly prismaService: PrismaService
  ) {
    const plaidEnv = this.configurationService.get('PLAID_ENV') || 'sandbox';
    const configuration = new Configuration({
      basePath: PlaidEnvironments[plaidEnv],
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': this.configurationService.get('PLAID_CLIENT_ID'),
          'PLAID-SECRET': this.configurationService.get('PLAID_SECRET')
        }
      }
    });
    this.plaidClient = new PlaidApi(configuration);
  }

  @Process('sync-holdings')
  public async handleSyncHoldings(job: Job<{ plaidItemId: string }>) {
    const { plaidItemId } = job.data;
    this.logger.log(`Processing sync for PlaidItem ${plaidItemId}`);

    const plaidItem = await this.prismaService.plaidItem.findUnique({
      include: { accounts: true },
      where: { id: plaidItemId }
    });

    if (!plaidItem) {
      this.logger.warn(`PlaidItem ${plaidItemId} not found, skipping`);
      return;
    }

    const accessToken = this.decryptAccessToken(plaidItem.accessToken);

    try {
      // Fetch investment holdings from Plaid
      const holdingsResponse =
        await this.plaidClient.investmentsHoldingsGet({
          access_token: accessToken
        });

      const { accounts, holdings, securities } = holdingsResponse.data;

      // Update account balances
      // For investment accounts, set balance to 0 because the value
      // comes from holdings (synced as Orders below). Using balances.current
      // would double-count since it includes investment value.
      const today = new Date(new Date().toISOString().split('T')[0]);

      for (const plaidAccount of accounts) {
        const matchingAccount = plaidItem.accounts.find(
          (a) => a.plaidAccountId === plaidAccount.account_id
        );

        if (matchingAccount) {
          const isInvestmentAccount =
            matchingAccount.accountType === 'investment';
          const newBalance = isInvestmentAccount
            ? 0
            : (plaidAccount.balances.current ?? 0);

          await this.prismaService.account.update({
            data: {
              balance: newBalance
            },
            where: {
              id_userId: {
                id: matchingAccount.id,
                userId: plaidItem.userId
              }
            }
          });

          // Create/update AccountBalance record (Ghostfolio uses this table
          // for balance display, not the raw Account.balance field)
          await this.prismaService.accountBalance.upsert({
            create: {
              accountId: matchingAccount.id,
              date: today,
              userId: plaidItem.userId,
              value: newBalance
            },
            update: {
              value: newBalance
            },
            where: {
              accountId_date: {
                accountId: matchingAccount.id,
                date: today
              }
            }
          });
        }
      }

      // Process holdings: create/update Orders for each holding
      for (const holding of holdings) {
        const security = securities.find(
          (s) => s.security_id === holding.security_id
        );

        if (!security || !security.ticker_symbol) {
          continue;
        }

        const matchingAccount = plaidItem.accounts.find(
          (a) => a.plaidAccountId === holding.account_id
        );

        if (!matchingAccount) {
          continue;
        }

        // Find or create SymbolProfile
        let symbolProfile = await this.prismaService.symbolProfile.findFirst({
          where: {
            symbol: security.ticker_symbol
          }
        });

        if (!symbolProfile) {
          symbolProfile = await this.prismaService.symbolProfile.create({
            data: {
              currency: security.iso_currency_code ?? 'USD',
              dataSource: 'MANUAL',
              name: security.name ?? security.ticker_symbol,
              symbol: security.ticker_symbol
            }
          });
        }

        // Check if we already have a plaid-synced order for this holding
        const existingOrder = await this.prismaService.order.findFirst({
          where: {
            accountId: matchingAccount.id,
            comment: {
              startsWith: `plaid-sync:${holding.security_id}`
            },
            userId: plaidItem.userId
          }
        });

        if (existingOrder) {
          // Update existing order with latest quantity/price
          await this.prismaService.order.update({
            data: {
              quantity: holding.quantity,
              unitPrice: holding.cost_basis
                ? holding.cost_basis / holding.quantity
                : holding.institution_price ?? 0
            },
            where: { id: existingOrder.id }
          });
        } else {
          // Create new order
          await this.prismaService.order.create({
            data: {
              accountId: matchingAccount.id,
              accountUserId: plaidItem.userId,
              comment: `plaid-sync:${holding.security_id}`,
              currency: security.iso_currency_code ?? 'USD',
              date: new Date(),
              fee: 0,
              isDraft: false,
              quantity: holding.quantity,
              symbolProfileId: symbolProfile.id,
              type: 'BUY',
              unitPrice: holding.cost_basis
                ? holding.cost_basis / holding.quantity
                : holding.institution_price ?? 0,
              userId: plaidItem.userId
            } as Prisma.OrderUncheckedCreateInput
          });
        }

        // Store current market price in MarketData
        if (holding.institution_price) {
          await this.prismaService.marketData.upsert({
            create: {
              dataSource: symbolProfile.dataSource,
              date: new Date(new Date().toISOString().split('T')[0]),
              marketPrice: holding.institution_price,
              symbol: security.ticker_symbol
            },
            update: {
              marketPrice: holding.institution_price
            },
            where: {
              dataSource_date_symbol: {
                dataSource: symbolProfile.dataSource,
                date: new Date(new Date().toISOString().split('T')[0]),
                symbol: security.ticker_symbol
              }
            }
          });
        }
      }

      // Update lastSyncedAt and clear error
      await this.prismaService.plaidItem.update({
        data: {
          error: null,
          lastSyncedAt: new Date()
        },
        where: { id: plaidItemId }
      });

      this.logger.log(
        `Sync complete for PlaidItem ${plaidItemId}: ${holdings.length} holdings processed`
      );
    } catch (error) {
      this.logger.error(
        `Sync failed for PlaidItem ${plaidItemId}: ${error.message}`
      );

      // Update error status
      await this.prismaService.plaidItem.update({
        data: {
          error: error.response?.data?.error_code ?? 'SYNC_FAILED'
        },
        where: { id: plaidItemId }
      });

      throw error; // Rethrow so Bull retries
    }
  }

  private decryptAccessToken(encryptedToken: string): string {
    const keyStr = this.configurationService.get('PLAID_ENCRYPTION_KEY');
    const key = Buffer.from(keyStr.slice(0, 32), 'utf8');
    const [ivHex, authTagHex, encryptedHex] = encryptedToken.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}
