import { PlaidSyncService } from '@ghostfolio/api/app/plaid-sync/plaid-sync.service';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';

import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException
} from '@nestjs/common';
import {
  Configuration,
  CountryCode,
  PlaidApi,
  PlaidEnvironments,
  Products
} from 'plaid';
import * as crypto from 'crypto';

@Injectable()
export class PlaidService {
  private readonly logger = new Logger(PlaidService.name);
  private plaidClient: PlaidApi;

  public constructor(
    private readonly configurationService: ConfigurationService,
    private readonly plaidSyncService: PlaidSyncService,
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

  public isEnabled(): boolean {
    return this.configurationService.get('ENABLE_FEATURE_PLAID') === true;
  }

  public async createLinkToken(userId: string): Promise<{
    linkToken: string;
    expiration: string;
  }> {
    this.ensureEnabled();

    const response = await this.plaidClient.linkTokenCreate({
      client_name: 'Ghostfolio',
      country_codes: [CountryCode.Us],
      language: 'en',
      products: [Products.Investments],
      user: {
        client_user_id: userId
      }
    });

    return {
      linkToken: response.data.link_token,
      expiration: response.data.expiration
    };
  }

  public async createUpdateLinkToken(
    userId: string,
    plaidItemId: string
  ): Promise<{
    linkToken: string;
    expiration: string;
  }> {
    this.ensureEnabled();

    const plaidItem = await this.prismaService.plaidItem.findUnique({
      where: { id: plaidItemId }
    });

    if (!plaidItem) {
      throw new NotFoundException('PlaidItem not found');
    }

    if (plaidItem.userId !== userId) {
      throw new ForbiddenException('Not owner of PlaidItem');
    }

    const decryptedToken = this.decryptAccessToken(plaidItem.accessToken);

    const response = await this.plaidClient.linkTokenCreate({
      access_token: decryptedToken,
      client_name: 'Ghostfolio',
      country_codes: [CountryCode.Us],
      language: 'en',
      user: {
        client_user_id: userId
      }
    });

    return {
      linkToken: response.data.link_token,
      expiration: response.data.expiration
    };
  }

  public async exchangeToken(
    userId: string,
    {
      publicToken,
      institutionId,
      institutionName,
      accounts
    }: {
      publicToken: string;
      institutionId: string;
      institutionName: string;
      accounts: {
        id: string;
        name: string;
        type: string;
        subtype: string;
        mask: string;
      }[];
    }
  ) {
    this.ensureEnabled();

    // Exchange public token for access token
    const exchangeResponse =
      await this.plaidClient.itemPublicTokenExchange({
        public_token: publicToken
      });

    const accessToken = exchangeResponse.data.access_token;
    const itemId = exchangeResponse.data.item_id;

    // Encrypt the access token for storage
    const encryptedToken = this.encryptAccessToken(accessToken);

    // Find or create platform for the institution
    let platform = await this.prismaService.platform.findFirst({
      where: { name: institutionName }
    });

    if (!platform) {
      platform = await this.prismaService.platform.create({
        data: {
          name: institutionName,
          url: ''
        }
      });
    }

    // Check for existing PlaidItem for the same institution + user
    const existingPlaidItem = await this.prismaService.plaidItem.findFirst({
      include: { accounts: true },
      where: { institutionId, userId }
    });

    let plaidItem;

    if (existingPlaidItem) {
      // Update existing PlaidItem with new access token and item ID
      plaidItem = await this.prismaService.plaidItem.update({
        data: {
          accessToken: encryptedToken,
          error: null,
          itemId,
          lastSyncedAt: null
        },
        where: { id: existingPlaidItem.id }
      });

      this.logger.log(
        `Reusing existing PlaidItem ${existingPlaidItem.id} for institution ${institutionId}`
      );

      // Unlink orphaned accounts from the old connection
      await this.prismaService.account.updateMany({
        data: { plaidAccountId: null, plaidItemId: null },
        where: { plaidItemId: existingPlaidItem.id }
      });
    } else {
      // Create new PlaidItem
      plaidItem = await this.prismaService.plaidItem.create({
        data: {
          accessToken: encryptedToken,
          institutionId,
          institutionName,
          itemId,
          userId
        }
      });
    }

    // Create accounts for each Plaid account
    const createdAccounts = [];
    for (const acct of accounts) {
      const account = await this.prismaService.account.create({
        data: {
          accountType: acct.type,
          currency: 'USD',
          name: `${acct.name} (${acct.mask})`,
          plaidAccountId: acct.id,
          plaidItemId: plaidItem.id,
          platformId: platform.id,
          userId
        }
      });
      createdAccounts.push({
        accountId: account.id,
        name: account.name,
        plaidAccountId: acct.id
      });
    }

    // Auto-trigger sync to pull balances and holdings
    try {
      await this.plaidSyncService.enqueueSyncJob(plaidItem.id);
      this.logger.log(
        `Auto-enqueued sync job for newly linked PlaidItem ${plaidItem.id}`
      );
    } catch (error) {
      this.logger.warn(
        `Failed to auto-enqueue sync for PlaidItem ${plaidItem.id}: ${error.message}`
      );
    }

    return {
      accounts: createdAccounts,
      plaidItemId: plaidItem.id
    };
  }

  public async getItems(userId: string) {
    if (!this.isEnabled()) {
      return { enabled: false, items: [] };
    }

    const items = await this.prismaService.plaidItem.findMany({
      include: {
        _count: {
          select: { accounts: true }
        }
      },
      where: { userId }
    });

    return {
      enabled: true,
      items: items.map((item) => ({
        accountCount: item._count.accounts,
        consentExpiresAt: item.consentExpiresAt?.toISOString() ?? null,
        createdAt: item.createdAt.toISOString(),
        error: item.error,
        id: item.id,
        institutionId: item.institutionId,
        institutionName: item.institutionName,
        lastSyncedAt: item.lastSyncedAt?.toISOString() ?? null
      }))
    };
  }

  public async triggerSync(userId: string, plaidItemId: string) {
    this.ensureEnabled();

    const plaidItem = await this.prismaService.plaidItem.findUnique({
      where: { id: plaidItemId }
    });

    if (!plaidItem) {
      throw new NotFoundException('PlaidItem not found');
    }

    if (plaidItem.userId !== userId) {
      throw new ForbiddenException('Not owner of PlaidItem');
    }

    const jobId = await this.plaidSyncService.enqueueSyncJob(plaidItemId);

    return {
      jobId,
      message: 'Sync job enqueued'
    };
  }

  public async deleteItem(userId: string, plaidItemId: string) {
    this.ensureEnabled();

    const plaidItem = await this.prismaService.plaidItem.findUnique({
      where: { id: plaidItemId }
    });

    if (!plaidItem) {
      throw new NotFoundException('PlaidItem not found');
    }

    if (plaidItem.userId !== userId) {
      throw new ForbiddenException('Not owner of PlaidItem');
    }

    // Try to remove from Plaid (best effort)
    try {
      const decryptedToken = this.decryptAccessToken(plaidItem.accessToken);
      await this.plaidClient.itemRemove({
        access_token: decryptedToken
      });
    } catch (error) {
      this.logger.warn(
        `Failed to remove Plaid item ${plaidItemId}: ${error.message}`
      );
    }

    // Unlink accounts (clear plaidItemId, keep account data)
    await this.prismaService.account.updateMany({
      data: {
        plaidAccountId: null,
        plaidItemId: null
      },
      where: { plaidItemId: plaidItem.id }
    });

    // Delete PlaidItem record
    await this.prismaService.plaidItem.delete({
      where: { id: plaidItemId }
    });

    return { message: 'Plaid connection disconnected' };
  }

  public async handleWebhook(payload: {
    error?: object;
    item_id: string;
    webhook_code: string;
    webhook_type: string;
  }) {
    const { item_id, webhook_code, webhook_type } = payload;

    this.logger.log(
      `Plaid webhook received: ${webhook_type}.${webhook_code} for item ${item_id}`
    );

    const plaidItem = await this.prismaService.plaidItem.findUnique({
      where: { itemId: item_id }
    });

    if (!plaidItem) {
      this.logger.warn(`Webhook for unknown item: ${item_id}`);
      return;
    }

    switch (webhook_type) {
      case 'HOLDINGS':
      case 'INVESTMENTS_TRANSACTIONS':
        await this.plaidSyncService.enqueueSyncJob(plaidItem.id);
        this.logger.log(`Sync job enqueued for item ${plaidItem.id}`);
        break;

      case 'ITEM':
        if (webhook_code === 'PENDING_EXPIRATION') {
          await this.prismaService.plaidItem.update({
            data: {
              consentExpiresAt:
                (payload as any).consent_expiration_time ?? null,
              error: 'PENDING_EXPIRATION'
            },
            where: { id: plaidItem.id }
          });
        } else if (webhook_code === 'ERROR') {
          await this.prismaService.plaidItem.update({
            data: {
              error: (payload.error as any)?.error_code ?? 'UNKNOWN_ERROR'
            },
            where: { id: plaidItem.id }
          });
        }
        break;

      default:
        this.logger.log(
          `Unhandled webhook type: ${webhook_type}.${webhook_code}`
        );
    }
  }

  // --- Encryption helpers ---

  private encryptAccessToken(plainToken: string): string {
    const key = this.getEncryptionKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    let encrypted = cipher.update(plainToken, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  private decryptAccessToken(encryptedToken: string): string {
    const key = this.getEncryptionKey();
    const [ivHex, authTagHex, encryptedHex] = encryptedToken.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  private getEncryptionKey(): Buffer {
    const keyStr = this.configurationService.get('PLAID_ENCRYPTION_KEY');
    if (!keyStr || keyStr.length < 32) {
      throw new Error(
        'PLAID_ENCRYPTION_KEY must be at least 32 characters for AES-256'
      );
    }
    // Use first 32 bytes of the key string
    return Buffer.from(keyStr.slice(0, 32), 'utf8');
  }

  private ensureEnabled() {
    if (!this.isEnabled()) {
      throw new ForbiddenException('Plaid feature is disabled');
    }
  }
}
