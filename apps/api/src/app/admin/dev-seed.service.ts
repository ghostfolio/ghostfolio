import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { DataGatheringService } from '@ghostfolio/api/services/queues/data-gathering/data-gathering.service';

import { Injectable, Logger } from '@nestjs/common';
import { DataSource, Prisma } from '@prisma/client';

@Injectable()
export class DevSeedService {
  private readonly logger = new Logger(DevSeedService.name);

  public constructor(
    private readonly dataGatheringService: DataGatheringService,
    private readonly prismaService: PrismaService
  ) {}

  /**
   * Wipe ALL seeded data: accounts, activities, symbol profiles, market data,
   * platforms AND family-office data.  Core user record is preserved.
   */
  public async clearDatabase(): Promise<{ deleted: Record<string, number> }> {
    this.logger.log('Clearing all demo data…');

    // ── 1. Family-office tables (children first) ─────────────────
    const assetValuations =
      await this.prismaService.assetValuation.deleteMany({});
    const partnershipValuations =
      await this.prismaService.partnershipValuation.deleteMany({});
    const partnershipAssets =
      await this.prismaService.partnershipAsset.deleteMany({});
    const kDocuments = await this.prismaService.kDocument.deleteMany({});
    const distributions = await this.prismaService.distribution.deleteMany({});
    const documents = await this.prismaService.document.deleteMany({});
    const memberships =
      await this.prismaService.partnershipMembership.deleteMany({});
    const ownerships = await this.prismaService.ownership.deleteMany({});
    const partnerships = await this.prismaService.partnership.deleteMany({});
    const entities = await this.prismaService.entity.deleteMany({});

    // ── 2. Portfolio tables ──────────────────────────────────────
    const accountBalances =
      await this.prismaService.accountBalance.deleteMany({});
    const orders = await this.prismaService.order.deleteMany({});
    const accounts = await this.prismaService.account.deleteMany({});
    const marketData = await this.prismaService.marketData.deleteMany({});
    const symbolProfiles =
      await this.prismaService.symbolProfile.deleteMany({});
    const platforms = await this.prismaService.platform.deleteMany({});
    const tags = await this.prismaService.tag.deleteMany({});

    const result = {
      accountBalances: accountBalances.count,
      accounts: accounts.count,
      assetValuations: assetValuations.count,
      distributions: distributions.count,
      documents: documents.count,
      entities: entities.count,
      kDocuments: kDocuments.count,
      marketData: marketData.count,
      memberships: memberships.count,
      orders: orders.count,
      ownerships: ownerships.count,
      partnershipAssets: partnershipAssets.count,
      partnershipValuations: partnershipValuations.count,
      partnerships: partnerships.count,
      platforms: platforms.count,
      symbolProfiles: symbolProfiles.count,
      tags: tags.count
    };

    this.logger.log(`Database cleared: ${JSON.stringify(result)}`);

    return { deleted: result };
  }

  /**
   * Populate 3 years of realistic demo data covering every page:
   *   - Platforms, Accounts, SymbolProfiles, MarketData, Orders/Activities
   *   - Family-office: Entities, Partnerships, Assets, Valuations,
   *     Memberships, Distributions, K-1 Documents
   */
  public async populateDummyData({
    userId
  }: {
    userId: string;
  }): Promise<{ created: Record<string, number> }> {
    this.logger.log(`Populating dummy data for user ${userId}…`);

    const counts: Record<string, number> = {
      accountBalances: 0,
      accounts: 0,
      activities: 0,
      assetValuations: 0,
      distributions: 0,
      entities: 0,
      kDocuments: 0,
      marketData: 0,
      memberships: 0,
      partnershipAssets: 0,
      partnershipValuations: 0,
      partnerships: 0,
      platforms: 0,
      symbolProfiles: 0,
      tags: 0
    };

    // ================================================================
    //  PART A — STANDARD PORTFOLIO DATA (Accounts, Activities, etc.)
    // ================================================================

    // ── A1. Platforms ────────────────────────────────────────────────
    const platformDefs = [
      { name: 'Charles Schwab', url: 'https://www.schwab.com' },
      { name: 'Vanguard', url: 'https://www.vanguard.com' },
      {
        name: 'Interactive Brokers',
        url: 'https://www.interactivebrokers.com'
      },
      { name: 'Coinbase', url: 'https://www.coinbase.com' },
      { name: 'Fidelity', url: 'https://www.fidelity.com' }
    ];

    const platforms: Record<string, string> = {};

    for (const def of platformDefs) {
      const p = await this.prismaService.platform.upsert({
        create: def,
        update: { name: def.name },
        where: { url: def.url }
      });

      platforms[def.name] = p.id;
      counts.platforms++;
    }

    // ── A2. Tags ────────────────────────────────────────────────────
    const tagDefs = [
      'Long-term Hold',
      'Tax-loss Harvest',
      'Income',
      'Growth',
      'Speculative'
    ];

    const tagMap: Record<string, string> = {};

    for (const name of tagDefs) {
      const t = await this.prismaService.tag.upsert({
        create: { name, userId },
        update: {},
        where: { name_userId: { name, userId } }
      });

      tagMap[name] = t.id;
      counts.tags++;
    }

    // ── A3. Accounts ────────────────────────────────────────────────
    const accountDefs = [
      {
        balance: 45230.5,
        currency: 'USD',
        name: 'Schwab Individual Brokerage',
        platformKey: 'Charles Schwab'
      },
      {
        balance: 182400.0,
        currency: 'USD',
        name: 'Schwab Traditional IRA',
        platformKey: 'Charles Schwab'
      },
      {
        balance: 26780.0,
        currency: 'USD',
        name: 'Vanguard Roth IRA',
        platformKey: 'Vanguard'
      },
      {
        balance: 312500.0,
        currency: 'USD',
        name: 'Fidelity 401(k)',
        platformKey: 'Fidelity'
      },
      {
        balance: 8920.0,
        currency: 'USD',
        name: 'Coinbase',
        platformKey: 'Coinbase'
      },
      {
        balance: 67800.0,
        currency: 'USD',
        name: 'Interactive Brokers Margin',
        platformKey: 'Interactive Brokers'
      }
    ];

    const accountRecords: { id: string; name: string }[] = [];

    for (const def of accountDefs) {
      const a = await this.prismaService.account.create({
        data: {
          balance: def.balance,
          currency: def.currency,
          name: def.name,
          platform: { connect: { id: platforms[def.platformKey] } },
          user: { connect: { id: userId } }
        }
      });

      accountRecords.push({ id: a.id, name: def.name });
      counts.accounts++;

      // Create quarterly balance snapshots for 3 years
      const balanceMultipliers = [
        0.65, 0.68, 0.72, 0.75, 0.78, 0.8, 0.83, 0.86, 0.88, 0.91, 0.95, 1.0
      ];
      const dates = [
        '2023-01-01',
        '2023-04-01',
        '2023-07-01',
        '2023-10-01',
        '2024-01-01',
        '2024-04-01',
        '2024-07-01',
        '2024-10-01',
        '2025-01-01',
        '2025-04-01',
        '2025-07-01',
        '2025-10-01'
      ];

      for (let i = 0; i < dates.length; i++) {
        await this.prismaService.accountBalance.create({
          data: {
            accountId: a.id,
            date: new Date(dates[i]),
            userId,
            value: def.balance * balanceMultipliers[i]
          }
        });

        counts.accountBalances++;
      }
    }

    // Shorthand
    const acctSchwabBrokerage = accountRecords[0];
    const acctSchwabIra = accountRecords[1];
    const acctVanguardRoth = accountRecords[2];
    const acct401k = accountRecords[3];
    const acctCoinbase = accountRecords[4];
    const acctIBKR = accountRecords[5];

    // ── A4. Symbol Profiles (live data sources) ─────────────────────
    // All symbols use YAHOO (full historical data, including crypto via BTCUSD/ETHUSD).
    // The optional `key` field is an alias used in buildActivities().
    const symbolDefs: {
      assetClass: string;
      assetSubClass: string;
      currency: string;
      dataSource: DataSource;
      key?: string;
      name: string;
      symbol: string;
    }[] = [
      // US Large Cap Stocks
      {
        assetClass: 'EQUITY',
        assetSubClass: 'STOCK',
        currency: 'USD',
        dataSource: DataSource.YAHOO,
        name: 'Apple Inc.',
        symbol: 'AAPL'
      },
      {
        assetClass: 'EQUITY',
        assetSubClass: 'STOCK',
        currency: 'USD',
        dataSource: DataSource.YAHOO,
        name: 'Microsoft Corporation',
        symbol: 'MSFT'
      },
      {
        assetClass: 'EQUITY',
        assetSubClass: 'STOCK',
        currency: 'USD',
        dataSource: DataSource.YAHOO,
        name: 'Amazon.com Inc.',
        symbol: 'AMZN'
      },
      {
        assetClass: 'EQUITY',
        assetSubClass: 'STOCK',
        currency: 'USD',
        dataSource: DataSource.YAHOO,
        name: 'NVIDIA Corporation',
        symbol: 'NVDA'
      },
      {
        assetClass: 'EQUITY',
        assetSubClass: 'STOCK',
        currency: 'USD',
        dataSource: DataSource.YAHOO,
        name: 'Alphabet Inc.',
        symbol: 'GOOGL'
      },
      {
        assetClass: 'EQUITY',
        assetSubClass: 'STOCK',
        currency: 'USD',
        dataSource: DataSource.YAHOO,
        name: 'Tesla Inc.',
        symbol: 'TSLA'
      },
      {
        assetClass: 'EQUITY',
        assetSubClass: 'STOCK',
        currency: 'USD',
        dataSource: DataSource.YAHOO,
        name: 'JPMorgan Chase & Co.',
        symbol: 'JPM'
      },
      {
        assetClass: 'EQUITY',
        assetSubClass: 'STOCK',
        currency: 'USD',
        dataSource: DataSource.YAHOO,
        name: 'Johnson & Johnson',
        symbol: 'JNJ'
      },
      // ETFs
      {
        assetClass: 'EQUITY',
        assetSubClass: 'ETF',
        currency: 'USD',
        dataSource: DataSource.YAHOO,
        name: 'Vanguard S&P 500 ETF',
        symbol: 'VOO'
      },
      {
        assetClass: 'EQUITY',
        assetSubClass: 'ETF',
        currency: 'USD',
        dataSource: DataSource.YAHOO,
        name: 'Vanguard Total Stock Market ETF',
        symbol: 'VTI'
      },
      {
        assetClass: 'EQUITY',
        assetSubClass: 'ETF',
        currency: 'USD',
        dataSource: DataSource.YAHOO,
        name: 'Vanguard Total International ETF',
        symbol: 'VXUS'
      },
      {
        assetClass: 'FIXED_INCOME',
        assetSubClass: 'BOND',
        currency: 'USD',
        dataSource: DataSource.YAHOO,
        name: 'iShares Core US Aggregate Bond ETF',
        symbol: 'AGG'
      },
      {
        assetClass: 'REAL_ESTATE',
        assetSubClass: 'ETF',
        currency: 'USD',
        dataSource: DataSource.YAHOO,
        name: 'Vanguard Real Estate ETF',
        symbol: 'VNQ'
      },
      // Crypto — internal symbol is BTCUSD/ETHUSD; the Yahoo Finance data
      // enhancer automatically converts to BTC-USD/ETH-USD for API calls.
      {
        assetClass: 'ALTERNATIVE_INVESTMENT',
        assetSubClass: 'CRYPTOCURRENCY',
        currency: 'USD',
        dataSource: DataSource.YAHOO,
        key: 'BTC',
        name: 'Bitcoin',
        symbol: 'BTCUSD'
      },
      {
        assetClass: 'ALTERNATIVE_INVESTMENT',
        assetSubClass: 'CRYPTOCURRENCY',
        currency: 'USD',
        dataSource: DataSource.YAHOO,
        key: 'ETH',
        name: 'Ethereum',
        symbol: 'ETHUSD'
      },
      // Commodities
      {
        assetClass: 'COMMODITY',
        assetSubClass: 'ETF',
        currency: 'USD',
        dataSource: DataSource.YAHOO,
        name: 'SPDR Gold Shares',
        symbol: 'GLD'
      }
    ];

    const symbolProfileMap: Record<string, string> = {};

    for (const def of symbolDefs) {
      const sp = await this.prismaService.symbolProfile.upsert({
        create: {
          assetClass: def.assetClass as any,
          assetSubClass: def.assetSubClass as any,
          currency: def.currency,
          dataSource: def.dataSource,
          name: def.name,
          symbol: def.symbol
        },
        update: {
          assetClass: def.assetClass as any,
          assetSubClass: def.assetSubClass as any,
          name: def.name
        },
        where: {
          dataSource_symbol: {
            dataSource: def.dataSource,
            symbol: def.symbol
          }
        }
      });

      // Use `key` alias (e.g. 'BTC') when present so buildActivities()
      // can still reference symbols by their common ticker.
      symbolProfileMap[def.key ?? def.symbol] = sp.id;
      counts.symbolProfiles++;
    }

    // ── A5. Market Data — fetched from live providers ────────────────
    // Historical prices will be gathered asynchronously by the data
    // gathering queue after seed completes (see gatherMax() at the end).
    // No hardcoded prices needed — Yahoo Finance (stocks/ETFs) and
    // Yahoo Finance provides real historical data for all symbols.

    // ── A6. Activities / Orders — 3 years of realistic trading ──────
    const activities = this.buildActivities({
      accountIds: {
        brokerage: acctSchwabBrokerage.id,
        coinbase: acctCoinbase.id,
        fourOhOneK: acct401k.id,
        ibkr: acctIBKR.id,
        ira: acctSchwabIra.id,
        roth: acctVanguardRoth.id
      },
      symbolProfileMap,
      userId
    });

    for (const activity of activities) {
      await this.prismaService.order.create({
        data: activity as any
      });

      counts.activities++;
    }

    // ================================================================
    //  PART B — FAMILY OFFICE DATA
    // ================================================================

    // ── B1. Entities ─────────────────────────────────────────────────
    const entityDefs = [
      {
        name: 'Smith Family Trust',
        taxId: '36-7891234',
        type: 'TRUST' as const
      },
      {
        name: 'Smith Holdings LLC',
        taxId: '82-4567890',
        type: 'LLC' as const
      },
      {
        name: 'James R. Smith',
        taxId: '***-**-4521',
        type: 'INDIVIDUAL' as const
      },
      {
        name: 'Smith Foundation',
        taxId: '47-1234567',
        type: 'FOUNDATION' as const
      }
    ];

    const foEntities: { id: string; name: string }[] = [];

    for (const def of entityDefs) {
      const entity = await this.prismaService.entity.create({
        data: { ...def, userId }
      });

      foEntities.push(entity);
      counts.entities++;
    }

    // ── B2. Partnerships ─────────────────────────────────────────────
    const partnershipDefs = [
      {
        currency: 'USD',
        fiscalYearEnd: 12,
        inceptionDate: new Date('2018-03-15'),
        name: 'Sequoia Capital Fund XVIII',
        type: 'FUND' as const
      },
      {
        currency: 'USD',
        fiscalYearEnd: 12,
        inceptionDate: new Date('2019-06-01'),
        name: 'Blackstone Real Estate Partners IX',
        type: 'LP' as const
      },
      {
        currency: 'USD',
        fiscalYearEnd: 12,
        inceptionDate: new Date('2020-01-10'),
        name: 'Brookfield Infrastructure Partners',
        type: 'LP' as const
      },
      {
        currency: 'USD',
        fiscalYearEnd: 3,
        inceptionDate: new Date('2017-09-01'),
        name: 'Ares Capital Senior Lending Fund',
        type: 'FUND' as const
      },
      {
        currency: 'USD',
        fiscalYearEnd: 12,
        inceptionDate: new Date('2021-04-01'),
        name: 'KKR Global Impact Fund II',
        type: 'LP' as const
      },
      {
        currency: 'USD',
        fiscalYearEnd: 12,
        inceptionDate: new Date('2019-11-15'),
        name: 'Pimco Corporate Bond Strategy',
        type: 'FUND' as const
      },
      {
        currency: 'USD',
        fiscalYearEnd: 12,
        inceptionDate: new Date('2022-02-01'),
        name: 'Masterworks Art Fund VII',
        type: 'LLC' as const
      }
    ];

    const foPartnerships: { id: string; name: string }[] = [];

    for (const def of partnershipDefs) {
      const p = await this.prismaService.partnership.create({
        data: { ...def, userId }
      });

      foPartnerships.push(p);
      counts.partnerships++;
    }

    const [sequoia, blackstone, brookfield, ares, kkr, pimco, masterworks] =
      foPartnerships;

    // ── B3. Partnership Assets ───────────────────────────────────────
    const assetDefs = [
      {
        acquisitionCost: 5000000,
        acquisitionDate: new Date('2018-06-01'),
        assetType: 'VENTURE_CAPITAL' as const,
        currency: 'USD',
        currentValue: 12500000,
        name: 'Series B – Stripe Inc.',
        partnershipId: sequoia.id
      },
      {
        acquisitionCost: 3000000,
        acquisitionDate: new Date('2019-01-15'),
        assetType: 'VENTURE_CAPITAL' as const,
        currency: 'USD',
        currentValue: 8200000,
        name: 'Series A – Figma',
        partnershipId: sequoia.id
      },
      {
        acquisitionCost: 8000000,
        acquisitionDate: new Date('2019-09-01'),
        assetType: 'REAL_ESTATE' as const,
        currency: 'USD',
        currentValue: 11200000,
        name: '200 Park Avenue Office Tower',
        partnershipId: blackstone.id
      },
      {
        acquisitionCost: 6000000,
        acquisitionDate: new Date('2020-03-01'),
        assetType: 'REAL_ESTATE' as const,
        currency: 'USD',
        currentValue: 7800000,
        name: 'Hilton Logistics Portfolio',
        partnershipId: blackstone.id
      },
      {
        acquisitionCost: 4500000,
        acquisitionDate: new Date('2020-04-01'),
        assetType: 'REAL_ESTATE' as const,
        currency: 'USD',
        currentValue: 5900000,
        name: 'Solar Portfolio',
        partnershipId: brookfield.id
      },
      {
        acquisitionCost: 2000000,
        acquisitionDate: new Date('2020-06-15'),
        assetType: 'COMMODITY' as const,
        currency: 'USD',
        currentValue: 2650000,
        name: 'Natural Gas Infrastructure',
        partnershipId: brookfield.id
      },
      {
        acquisitionCost: 10000000,
        acquisitionDate: new Date('2017-12-01'),
        assetType: 'FIXED_INCOME' as const,
        currency: 'USD',
        currentValue: 10450000,
        name: 'Senior Secured Loan Portfolio',
        partnershipId: ares.id
      },
      {
        acquisitionCost: 4000000,
        acquisitionDate: new Date('2021-07-01'),
        assetType: 'PRIVATE_EQUITY' as const,
        currency: 'USD',
        currentValue: 5600000,
        name: 'Envision Healthcare Buyout',
        partnershipId: kkr.id
      },
      {
        acquisitionCost: 3500000,
        acquisitionDate: new Date('2021-10-01'),
        assetType: 'PRIVATE_EQUITY' as const,
        currency: 'USD',
        currentValue: 4200000,
        name: 'BMC Software Recapitalization',
        partnershipId: kkr.id
      },
      {
        acquisitionCost: 7000000,
        acquisitionDate: new Date('2019-12-01'),
        assetType: 'FIXED_INCOME' as const,
        currency: 'USD',
        currentValue: 7350000,
        name: 'IG Corporate Bond Portfolio',
        partnershipId: pimco.id
      },
      {
        acquisitionCost: 2200000,
        acquisitionDate: new Date('2022-03-01'),
        assetType: 'ART_COLLECTIBLE' as const,
        currency: 'USD',
        currentValue: 2850000,
        name: 'Basquiat – Untitled (1982)',
        partnershipId: masterworks.id
      }
    ];

    const createdAssets: {
      acquisitionCost: any;
      currentValue: any;
      id: string;
    }[] = [];

    for (const def of assetDefs) {
      const asset = await this.prismaService.partnershipAsset.create({
        data: def
      });

      createdAssets.push(asset);
      counts.partnershipAssets++;
    }

    // ── B4. Partnership Valuations (quarterly NAVs, 2023–2025) ──────
    const navSchedule = this.buildPartnershipValuations(foPartnerships);

    for (const entry of navSchedule) {
      await this.prismaService.partnershipValuation.create({
        data: {
          date: entry.date,
          nav: entry.nav,
          partnership: { connect: { id: entry.partnershipId } },
          source: entry.source as any
        }
      });
      counts.partnershipValuations++;
    }

    // ── B5. Asset Valuations (annual) ────────────────────────────────
    for (const asset of createdAssets) {
      const baseCost = Number(asset.acquisitionCost);
      const currentVal = Number(asset.currentValue);
      const years = [2023, 2024, 2025];

      for (let i = 0; i < years.length; i++) {
        const progress = (i + 1) / years.length;
        const val = Math.round(
          baseCost + (currentVal - baseCost) * progress * 0.9
        );

        await this.prismaService.assetValuation.create({
          data: {
            date: new Date(`${years[i]}-12-31`),
            partnershipAssetId: asset.id,
            source: 'APPRAISAL',
            value: val
          }
        });

        counts.assetValuations++;
      }
    }

    // ── B6. Memberships ──────────────────────────────────────────────
    const [trust, holdingsLlc, james, foundation] = foEntities;

    const membershipDefs = [
      {
        capitalCommitment: 10000000,
        capitalContributed: 8000000,
        effectiveDate: new Date('2018-04-01'),
        entityId: trust.id,
        ownershipPercent: 4.5,
        partnershipId: sequoia.id
      },
      {
        capitalCommitment: 8000000,
        capitalContributed: 7000000,
        effectiveDate: new Date('2019-07-01'),
        entityId: trust.id,
        ownershipPercent: 3.8,
        partnershipId: blackstone.id
      },
      {
        capitalCommitment: 6000000,
        capitalContributed: 6000000,
        effectiveDate: new Date('2017-10-01'),
        entityId: trust.id,
        ownershipPercent: 5.2,
        partnershipId: ares.id
      },
      {
        capitalCommitment: 5000000,
        capitalContributed: 4200000,
        effectiveDate: new Date('2020-02-01'),
        entityId: holdingsLlc.id,
        ownershipPercent: 2.9,
        partnershipId: brookfield.id
      },
      {
        capitalCommitment: 7000000,
        capitalContributed: 5500000,
        effectiveDate: new Date('2021-05-01'),
        entityId: holdingsLlc.id,
        ownershipPercent: 3.1,
        partnershipId: kkr.id
      },
      {
        capitalCommitment: 5000000,
        capitalContributed: 5000000,
        effectiveDate: new Date('2019-12-01'),
        entityId: holdingsLlc.id,
        ownershipPercent: 6.0,
        partnershipId: pimco.id
      },
      {
        capitalCommitment: 2500000,
        capitalContributed: 2200000,
        effectiveDate: new Date('2022-03-01'),
        entityId: james.id,
        ownershipPercent: 8.5,
        partnershipId: masterworks.id
      },
      {
        capitalCommitment: 3000000,
        capitalContributed: 2000000,
        effectiveDate: new Date('2021-06-01'),
        entityId: foundation.id,
        ownershipPercent: 1.5,
        partnershipId: kkr.id
      }
    ];

    for (const def of membershipDefs) {
      await this.prismaService.partnershipMembership.create({ data: def });
      counts.memberships++;
    }

    // ── B7. Distributions ────────────────────────────────────────────
    const distributionDefs = this.buildDistributions({
      entities: foEntities,
      partnerships: foPartnerships
    });

    for (const def of distributionDefs) {
      await this.prismaService.distribution.create({
        data: {
          amount: def.amount,
          currency: def.currency,
          date: def.date,
          entity: { connect: { id: def.entityId } },
          partnership: { connect: { id: def.partnershipId } },
          type: def.type as any
        }
      });
      counts.distributions++;
    }

    // ── B8. K-1 Documents ────────────────────────────────────────────
    const k1Defs = this.buildK1Documents(foPartnerships);

    for (const def of k1Defs) {
      await this.prismaService.kDocument.create({
        data: {
          data: def.data as Prisma.InputJsonValue,
          filingStatus: def.filingStatus,
          partnership: { connect: { id: def.partnershipId } },
          taxYear: def.taxYear,
          type: def.type
        }
      });

      counts.kDocuments++;
    }

    // ── B9. Ownerships (Entity → Account links) ─────────────────────
    // Realistic mapping: Trust owns the IRA & 401(k), LLC owns
    // the brokerage & margin accounts, Individual owns Coinbase.
    const [trustEntity, llcEntity, jamesEntity] = foEntities;
    const ownershipDefs = [
      {
        accountId: accountRecords[1].id, // Schwab Traditional IRA
        accountUserId: userId,
        costBasis: 150000,
        effectiveDate: new Date('2020-01-15'),
        entityId: trustEntity.id,
        ownershipPercent: 100
      },
      {
        accountId: accountRecords[3].id, // Fidelity 401(k)
        accountUserId: userId,
        costBasis: 250000,
        effectiveDate: new Date('2019-06-01'),
        entityId: trustEntity.id,
        ownershipPercent: 100
      },
      {
        accountId: accountRecords[0].id, // Schwab Individual Brokerage
        accountUserId: userId,
        costBasis: 35000,
        effectiveDate: new Date('2021-03-10'),
        entityId: llcEntity.id,
        ownershipPercent: 100
      },
      {
        accountId: accountRecords[5].id, // Interactive Brokers Margin
        accountUserId: userId,
        costBasis: 50000,
        effectiveDate: new Date('2022-01-15'),
        entityId: llcEntity.id,
        ownershipPercent: 100
      },
      {
        accountId: accountRecords[2].id, // Vanguard Roth IRA
        accountUserId: userId,
        costBasis: 20000,
        effectiveDate: new Date('2020-09-01'),
        entityId: jamesEntity.id,
        ownershipPercent: 100
      },
      {
        accountId: accountRecords[4].id, // Coinbase
        accountUserId: userId,
        costBasis: 5000,
        effectiveDate: new Date('2023-02-14'),
        entityId: jamesEntity.id,
        ownershipPercent: 100
      }
    ];

    counts.ownerships = 0;

    for (const def of ownershipDefs) {
      await this.prismaService.ownership.create({ data: def });
      counts.ownerships++;
    }

    this.logger.log(`Dummy data populated: ${JSON.stringify(counts)}`);

    // ── Gather real historical market data from live providers ───────
    // This enqueues background jobs for Yahoo Finance (stocks/ETFs) and
    // (BTCUSD, ETHUSD, stocks, ETFs). Prices arrive asynchronously — the UI will
    // populate within ~30–60 seconds as the queue drains.
    this.logger.log(
      'Enqueuing market-data gathering jobs (Yahoo Finance)…'
    );
    await this.dataGatheringService.gatherMax();

    return { created: counts };
  }

  // ====================================================================
  //  PRIVATE HELPERS
  // ====================================================================

  /**
   * Build 3 years of realistic trading activities.
   */
  private buildActivities({
    accountIds,
    symbolProfileMap,
    userId
  }: {
    accountIds: {
      brokerage: string;
      coinbase: string;
      fourOhOneK: string;
      ibkr: string;
      ira: string;
      roth: string;
    };
    symbolProfileMap: Record<string, string>;
    userId: string;
  }): Record<string, unknown>[] {
    const orders: Record<string, unknown>[] = [];

    const add = (
      date: string,
      symbol: string,
      type: string,
      qty: number,
      price: number,
      accountId: string,
      fee: number = 0
    ) => {
      orders.push({
        account: {
          connect: { id_userId: { id: accountId, userId } }
        },
        currency: 'USD',
        date: new Date(date),
        fee,
        quantity: qty,
        SymbolProfile: {
          connect: { id: symbolProfileMap[symbol] }
        },
        type,
        unitPrice: price,
        user: { connect: { id: userId } }
      });
    };

    const { brokerage, coinbase, fourOhOneK, ibkr, ira, roth } = accountIds;

    // ── 2023 ─────────────────────────────────────────────────────────

    // Q1 2023 — Initial portfolio building
    add('2023-01-05', 'VOO', 'BUY', 50, 365, fourOhOneK, 0);
    add('2023-01-10', 'AAPL', 'BUY', 100, 130, brokerage, 4.95);
    add('2023-01-12', 'MSFT', 'BUY', 40, 240, brokerage, 4.95);
    add('2023-01-18', 'VTI', 'BUY', 80, 195, ira, 0);
    add('2023-01-25', 'AGG', 'BUY', 150, 98, ira, 0);
    add('2023-02-01', 'BTC', 'BUY', 0.5, 19500, coinbase, 14.5);
    add('2023-02-05', 'ETH', 'BUY', 5, 1400, coinbase, 8.0);
    add('2023-02-10', 'NVDA', 'BUY', 50, 155, ibkr, 1.0);
    add('2023-02-15', 'GOOGL', 'BUY', 60, 92, brokerage, 4.95);
    add('2023-03-01', 'JNJ', 'BUY', 40, 162, ira, 0);
    add('2023-03-10', 'JPM', 'BUY', 30, 128, brokerage, 4.95);
    add('2023-03-15', 'VNQ', 'BUY', 100, 78, roth, 0);
    add('2023-03-20', 'VXUS', 'BUY', 120, 54, roth, 0);
    add('2023-03-22', 'GLD', 'BUY', 50, 178, ira, 0);
    add('2023-03-28', 'TSLA', 'BUY', 25, 162, ibkr, 1.0);

    // Q1 2023 dividends
    add('2023-03-15', 'VOO', 'DIVIDEND', 50, 1.49, fourOhOneK, 0);
    add('2023-03-20', 'JNJ', 'DIVIDEND', 40, 1.13, ira, 0);
    add('2023-03-22', 'JPM', 'DIVIDEND', 30, 1.0, brokerage, 0);
    add('2023-03-25', 'VNQ', 'DIVIDEND', 100, 0.72, roth, 0);

    // Q2 2023 — Adding to positions
    add('2023-04-05', 'VOO', 'BUY', 25, 390, fourOhOneK, 0);
    add('2023-04-12', 'AMZN', 'BUY', 50, 102, brokerage, 4.95);
    add('2023-04-20', 'NVDA', 'BUY', 30, 210, ibkr, 1.0);
    add('2023-05-01', 'MSFT', 'BUY', 20, 275, brokerage, 4.95);
    add('2023-05-15', 'VTI', 'BUY', 40, 215, ira, 0);
    add('2023-06-01', 'AAPL', 'BUY', 30, 168, brokerage, 4.95);
    add('2023-06-10', 'BTC', 'BUY', 0.3, 30000, coinbase, 10.5);

    // Q2 2023 dividends
    add('2023-06-15', 'VOO', 'DIVIDEND', 75, 1.58, fourOhOneK, 0);
    add('2023-06-20', 'JNJ', 'DIVIDEND', 40, 1.19, ira, 0);
    add('2023-06-22', 'JPM', 'DIVIDEND', 30, 1.0, brokerage, 0);
    add('2023-06-25', 'VNQ', 'DIVIDEND', 100, 0.68, roth, 0);
    add('2023-06-28', 'VXUS', 'DIVIDEND', 120, 0.45, roth, 0);
    add('2023-05-10', 'AAPL', 'DIVIDEND', 130, 0.24, brokerage, 0);
    add('2023-05-12', 'MSFT', 'DIVIDEND', 60, 0.68, brokerage, 0);

    // Q3 2023
    add('2023-07-05', 'GOOGL', 'BUY', 40, 120, ibkr, 1.0);
    add('2023-07-15', 'VOO', 'BUY', 20, 420, fourOhOneK, 0);
    add('2023-08-01', 'ETH', 'BUY', 3, 1850, coinbase, 6.5);
    add('2023-08-10', 'TSLA', 'BUY', 15, 245, ibkr, 1.0);
    add('2023-08-20', 'AGG', 'BUY', 100, 93, ira, 0);
    add('2023-09-01', 'AMZN', 'BUY', 25, 128, brokerage, 4.95);

    // Q3 2023 dividends
    add('2023-09-15', 'VOO', 'DIVIDEND', 95, 1.49, fourOhOneK, 0);
    add('2023-09-20', 'JNJ', 'DIVIDEND', 40, 1.19, ira, 0);
    add('2023-09-22', 'JPM', 'DIVIDEND', 30, 1.0, brokerage, 0);
    add('2023-09-25', 'VNQ', 'DIVIDEND', 100, 0.72, roth, 0);
    add('2023-08-10', 'AAPL', 'DIVIDEND', 130, 0.24, brokerage, 0);
    add('2023-08-12', 'MSFT', 'DIVIDEND', 60, 0.68, brokerage, 0);

    // Q4 2023 — Rebalancing, some selling
    add('2023-10-05', 'VOO', 'BUY', 15, 425, fourOhOneK, 0);
    add('2023-10-15', 'GLD', 'BUY', 30, 180, ira, 0);
    add('2023-10-20', 'JNJ', 'SELL', 15, 155, ira, 0);
    add('2023-11-01', 'NVDA', 'BUY', 20, 470, ibkr, 1.0);
    add('2023-11-10', 'VTI', 'BUY', 30, 235, roth, 0);
    add('2023-11-20', 'VXUS', 'BUY', 60, 52, roth, 0);
    add('2023-12-01', 'MSFT', 'BUY', 15, 360, brokerage, 4.95);
    add('2023-12-10', 'BTC', 'BUY', 0.2, 42000, coinbase, 9.8);

    // Q4 2023 dividends
    add('2023-12-15', 'VOO', 'DIVIDEND', 110, 1.64, fourOhOneK, 0);
    add('2023-12-20', 'JNJ', 'DIVIDEND', 25, 1.19, ira, 0);
    add('2023-12-22', 'JPM', 'DIVIDEND', 30, 1.05, brokerage, 0);
    add('2023-12-25', 'VNQ', 'DIVIDEND', 100, 0.75, roth, 0);
    add('2023-12-28', 'VXUS', 'DIVIDEND', 180, 0.85, roth, 0);
    add('2023-11-10', 'AAPL', 'DIVIDEND', 130, 0.24, brokerage, 0);
    add('2023-11-12', 'MSFT', 'DIVIDEND', 75, 0.75, brokerage, 0);
    add('2023-12-05', 'AGG', 'DIVIDEND', 250, 0.28, ira, 0);

    // ── 2024 ─────────────────────────────────────────────────────────

    // Q1 2024
    add('2024-01-05', 'VOO', 'BUY', 30, 450, fourOhOneK, 0);
    add('2024-01-10', 'NVDA', 'BUY', 25, 510, ibkr, 1.0);
    add('2024-01-15', 'AAPL', 'BUY', 20, 192, brokerage, 4.95);
    add('2024-02-01', 'GOOGL', 'BUY', 30, 142, brokerage, 4.95);
    add('2024-02-10', 'AMZN', 'BUY', 30, 155, ibkr, 1.0);
    add('2024-02-15', 'VTI', 'BUY', 50, 250, ira, 0);
    add('2024-03-01', 'ETH', 'BUY', 2, 2800, coinbase, 5.0);
    add('2024-03-10', 'JPM', 'BUY', 25, 175, brokerage, 4.95);
    add('2024-03-15', 'TSLA', 'SELL', 15, 275, ibkr, 1.0);

    // Q1 2024 dividends
    add('2024-03-15', 'VOO', 'DIVIDEND', 140, 1.54, fourOhOneK, 0);
    add('2024-03-20', 'JNJ', 'DIVIDEND', 25, 1.24, ira, 0);
    add('2024-03-22', 'JPM', 'DIVIDEND', 55, 1.05, brokerage, 0);
    add('2024-03-25', 'VNQ', 'DIVIDEND', 100, 0.80, roth, 0);

    // Q2 2024
    add('2024-04-05', 'VOO', 'BUY', 20, 475, fourOhOneK, 0);
    add('2024-04-15', 'MSFT', 'BUY', 15, 400, brokerage, 4.95);
    add('2024-05-01', 'BTC', 'BUY', 0.15, 63000, coinbase, 11.0);
    add('2024-05-10', 'NVDA', 'BUY', 10, 720, ibkr, 1.0);
    add('2024-05-20', 'GLD', 'BUY', 20, 205, ira, 0);
    add('2024-06-01', 'AMZN', 'BUY', 20, 180, brokerage, 4.95);
    add('2024-06-10', 'VTI', 'BUY', 30, 265, roth, 0);
    add('2024-06-15', 'AAPL', 'SELL', 30, 215, brokerage, 4.95);

    // Q2 2024 dividends
    add('2024-06-15', 'VOO', 'DIVIDEND', 160, 1.62, fourOhOneK, 0);
    add('2024-06-20', 'JNJ', 'DIVIDEND', 25, 1.24, ira, 0);
    add('2024-06-22', 'JPM', 'DIVIDEND', 55, 1.15, brokerage, 0);
    add('2024-06-25', 'VNQ', 'DIVIDEND', 100, 0.78, roth, 0);
    add('2024-06-28', 'VXUS', 'DIVIDEND', 180, 0.50, roth, 0);
    add('2024-05-10', 'AAPL', 'DIVIDEND', 120, 0.25, brokerage, 0);
    add('2024-05-12', 'MSFT', 'DIVIDEND', 90, 0.75, brokerage, 0);

    // Q3 2024
    add('2024-07-05', 'VOO', 'BUY', 15, 498, fourOhOneK, 0);
    add('2024-07-15', 'GOOGL', 'BUY', 25, 170, ibkr, 1.0);
    add('2024-08-01', 'TSLA', 'BUY', 20, 240, ibkr, 1.0);
    add('2024-08-10', 'AGG', 'BUY', 80, 97, ira, 0);
    add('2024-09-01', 'ETH', 'BUY', 2, 3100, coinbase, 5.5);
    add('2024-09-10', 'NVDA', 'SELL', 20, 880, ibkr, 1.0);

    // Q3 2024 dividends
    add('2024-09-15', 'VOO', 'DIVIDEND', 175, 1.64, fourOhOneK, 0);
    add('2024-09-20', 'JNJ', 'DIVIDEND', 25, 1.24, ira, 0);
    add('2024-09-22', 'JPM', 'DIVIDEND', 55, 1.15, brokerage, 0);
    add('2024-09-25', 'VNQ', 'DIVIDEND', 100, 0.82, roth, 0);
    add('2024-08-10', 'AAPL', 'DIVIDEND', 120, 0.25, brokerage, 0);
    add('2024-08-12', 'MSFT', 'DIVIDEND', 90, 0.75, brokerage, 0);

    // Q4 2024
    add('2024-10-05', 'VOO', 'BUY', 20, 502, fourOhOneK, 0);
    add('2024-10-15', 'MSFT', 'BUY', 10, 435, brokerage, 4.95);
    add('2024-10-20', 'AMZN', 'BUY', 15, 190, brokerage, 4.95);
    add('2024-11-01', 'BTC', 'SELL', 0.2, 72000, coinbase, 16.8);
    add('2024-11-10', 'VTI', 'BUY', 25, 278, ira, 0);
    add('2024-11-15', 'GLD', 'BUY', 15, 230, ira, 0);
    add('2024-12-01', 'NVDA', 'BUY', 15, 950, ibkr, 1.0);
    add('2024-12-10', 'JPM', 'BUY', 20, 210, brokerage, 4.95);

    // Q4 2024 dividends
    add('2024-12-15', 'VOO', 'DIVIDEND', 195, 1.78, fourOhOneK, 0);
    add('2024-12-20', 'JNJ', 'DIVIDEND', 25, 1.24, ira, 0);
    add('2024-12-22', 'JPM', 'DIVIDEND', 75, 1.15, brokerage, 0);
    add('2024-12-25', 'VNQ', 'DIVIDEND', 100, 0.85, roth, 0);
    add('2024-12-28', 'VXUS', 'DIVIDEND', 180, 0.92, roth, 0);
    add('2024-11-10', 'AAPL', 'DIVIDEND', 120, 0.25, brokerage, 0);
    add('2024-11-12', 'MSFT', 'DIVIDEND', 100, 0.83, brokerage, 0);
    add('2024-12-05', 'AGG', 'DIVIDEND', 330, 0.29, ira, 0);

    // ── 2025 ─────────────────────────────────────────────────────────

    // Q1 2025
    add('2025-01-06', 'VOO', 'BUY', 25, 515, fourOhOneK, 0);
    add('2025-01-10', 'AAPL', 'BUY', 25, 232, brokerage, 4.95);
    add('2025-01-15', 'NVDA', 'BUY', 10, 960, ibkr, 1.0);
    add('2025-02-01', 'GOOGL', 'BUY', 20, 190, brokerage, 4.95);
    add('2025-02-10', 'ETH', 'BUY', 1.5, 3900, coinbase, 4.5);
    add('2025-02-15', 'VTI', 'BUY', 40, 292, ira, 0);
    add('2025-03-01', 'TSLA', 'BUY', 10, 305, ibkr, 1.0);
    add('2025-03-10', 'AMZN', 'BUY', 15, 210, brokerage, 4.95);

    // Q1 2025 dividends
    add('2025-03-15', 'VOO', 'DIVIDEND', 220, 1.82, fourOhOneK, 0);
    add('2025-03-20', 'JNJ', 'DIVIDEND', 25, 1.30, ira, 0);
    add('2025-03-22', 'JPM', 'DIVIDEND', 75, 1.20, brokerage, 0);
    add('2025-03-25', 'VNQ', 'DIVIDEND', 100, 0.88, roth, 0);

    // Q2 2025
    add('2025-04-05', 'VOO', 'BUY', 18, 542, fourOhOneK, 0);
    add('2025-04-15', 'MSFT', 'BUY', 12, 480, brokerage, 4.95);
    add('2025-05-01', 'BTC', 'BUY', 0.1, 98000, coinbase, 11.4);
    add('2025-05-10', 'NVDA', 'SELL', 15, 1080, ibkr, 1.0);
    add('2025-05-20', 'GLD', 'BUY', 10, 258, ira, 0);
    add('2025-06-01', 'GOOGL', 'SELL', 20, 210, brokerage, 4.95);
    add('2025-06-10', 'VTI', 'BUY', 20, 310, roth, 0);

    // Q2 2025 dividends
    add('2025-06-15', 'VOO', 'DIVIDEND', 238, 1.85, fourOhOneK, 0);
    add('2025-06-20', 'JNJ', 'DIVIDEND', 25, 1.30, ira, 0);
    add('2025-06-22', 'JPM', 'DIVIDEND', 75, 1.20, brokerage, 0);
    add('2025-06-25', 'VNQ', 'DIVIDEND', 100, 0.90, roth, 0);
    add('2025-06-28', 'VXUS', 'DIVIDEND', 180, 0.55, roth, 0);
    add('2025-05-10', 'AAPL', 'DIVIDEND', 145, 0.26, brokerage, 0);
    add('2025-05-12', 'MSFT', 'DIVIDEND', 112, 0.83, brokerage, 0);

    // Q3 2025
    add('2025-07-05', 'VOO', 'BUY', 15, 555, fourOhOneK, 0);
    add('2025-07-15', 'AMZN', 'BUY', 10, 230, ibkr, 1.0);
    add('2025-08-01', 'TSLA', 'SELL', 20, 350, ibkr, 1.0);
    add('2025-08-10', 'AGG', 'BUY', 50, 103, ira, 0);
    add('2025-09-01', 'ETH', 'SELL', 3, 4200, coinbase, 5.8);
    add('2025-09-10', 'AAPL', 'BUY', 20, 262, brokerage, 4.95);

    // Q3 2025 dividends
    add('2025-09-15', 'VOO', 'DIVIDEND', 253, 1.88, fourOhOneK, 0);
    add('2025-09-20', 'JNJ', 'DIVIDEND', 25, 1.30, ira, 0);
    add('2025-09-22', 'JPM', 'DIVIDEND', 75, 1.20, brokerage, 0);
    add('2025-09-25', 'VNQ', 'DIVIDEND', 100, 0.90, roth, 0);
    add('2025-08-10', 'AAPL', 'DIVIDEND', 165, 0.26, brokerage, 0);
    add('2025-08-12', 'MSFT', 'DIVIDEND', 112, 0.83, brokerage, 0);

    // Q4 2025
    add('2025-10-05', 'VOO', 'BUY', 12, 565, fourOhOneK, 0);
    add('2025-10-10', 'NVDA', 'BUY', 8, 1200, ibkr, 1.0);
    add('2025-10-20', 'MSFT', 'BUY', 8, 512, brokerage, 4.95);
    add('2025-11-01', 'BTC', 'SELL', 0.15, 108000, coinbase, 18.9);
    add('2025-11-10', 'VTI', 'BUY', 20, 325, ira, 0);
    add('2025-11-15', 'JPM', 'BUY', 10, 255, brokerage, 4.95);
    add('2025-12-01', 'GLD', 'BUY', 10, 282, ira, 0);

    // Q4 2025 dividends
    add('2025-12-15', 'VOO', 'DIVIDEND', 265, 1.92, fourOhOneK, 0);
    add('2025-12-20', 'JNJ', 'DIVIDEND', 25, 1.30, ira, 0);
    add('2025-12-22', 'JPM', 'DIVIDEND', 85, 1.25, brokerage, 0);
    add('2025-12-25', 'VNQ', 'DIVIDEND', 100, 0.92, roth, 0);
    add('2025-12-28', 'VXUS', 'DIVIDEND', 180, 0.58, roth, 0);
    add('2025-11-10', 'AAPL', 'DIVIDEND', 165, 0.26, brokerage, 0);
    add('2025-11-12', 'MSFT', 'DIVIDEND', 120, 0.83, brokerage, 0);
    add('2025-12-05', 'AGG', 'DIVIDEND', 380, 0.30, ira, 0);

    return orders;
  }

  /**
   * Build quarterly partnership NAV valuations for 2023-2025.
   */
  private buildPartnershipValuations(
    partnerships: { id: string; name: string }[]
  ): { date: Date; nav: number; partnershipId: string; source: string }[] {
    const [sequoia, blackstone, brookfield, ares, kkr, pimco, masterworks] =
      partnerships;

    const schedule: {
      navs: { date: string; nav: number }[];
      partnershipId: string;
    }[] = [
      {
        navs: [
          { date: '2023-03-31', nav: 18500000 },
          { date: '2023-06-30', nav: 19200000 },
          { date: '2023-09-30', nav: 19800000 },
          { date: '2023-12-31', nav: 20700000 },
          { date: '2024-03-31', nav: 21400000 },
          { date: '2024-06-30', nav: 22100000 },
          { date: '2024-09-30', nav: 22800000 },
          { date: '2024-12-31', nav: 23500000 },
          { date: '2025-03-31', nav: 24200000 },
          { date: '2025-06-30', nav: 24900000 },
          { date: '2025-09-30', nav: 25800000 },
          { date: '2025-12-31', nav: 26400000 }
        ],
        partnershipId: sequoia.id
      },
      {
        navs: [
          { date: '2023-03-31', nav: 17000000 },
          { date: '2023-06-30', nav: 17400000 },
          { date: '2023-09-30', nav: 17900000 },
          { date: '2023-12-31', nav: 18500000 },
          { date: '2024-03-31', nav: 18900000 },
          { date: '2024-06-30', nav: 19200000 },
          { date: '2024-09-30', nav: 19600000 },
          { date: '2024-12-31', nav: 20000000 },
          { date: '2025-03-31', nav: 20400000 },
          { date: '2025-06-30', nav: 20800000 },
          { date: '2025-09-30', nav: 21100000 },
          { date: '2025-12-31', nav: 21500000 }
        ],
        partnershipId: blackstone.id
      },
      {
        navs: [
          { date: '2023-06-30', nav: 8200000 },
          { date: '2023-12-31', nav: 8600000 },
          { date: '2024-06-30', nav: 9000000 },
          { date: '2024-12-31', nav: 9400000 },
          { date: '2025-06-30', nav: 9900000 },
          { date: '2025-12-31', nav: 10300000 }
        ],
        partnershipId: brookfield.id
      },
      {
        navs: [
          { date: '2023-03-31', nav: 10200000 },
          { date: '2023-09-30', nav: 10350000 },
          { date: '2024-03-31', nav: 10500000 },
          { date: '2024-09-30', nav: 10600000 },
          { date: '2025-03-31', nav: 10700000 },
          { date: '2025-09-30', nav: 10800000 },
          { date: '2025-12-31', nav: 10900000 }
        ],
        partnershipId: ares.id
      },
      {
        navs: [
          { date: '2023-06-30', nav: 7200000 },
          { date: '2023-12-31', nav: 7800000 },
          { date: '2024-06-30', nav: 8500000 },
          { date: '2024-12-31', nav: 9200000 },
          { date: '2025-06-30', nav: 9900000 },
          { date: '2025-12-31', nav: 10600000 }
        ],
        partnershipId: kkr.id
      },
      {
        navs: [
          { date: '2023-06-30', nav: 7100000 },
          { date: '2023-12-31', nav: 7250000 },
          { date: '2024-06-30', nav: 7400000 },
          { date: '2024-12-31', nav: 7550000 },
          { date: '2025-06-30', nav: 7700000 },
          { date: '2025-12-31', nav: 7850000 }
        ],
        partnershipId: pimco.id
      },
      {
        navs: [
          { date: '2023-06-30', nav: 2400000 },
          { date: '2023-12-31', nav: 2550000 },
          { date: '2024-06-30', nav: 2700000 },
          { date: '2024-12-31', nav: 2850000 },
          { date: '2025-06-30', nav: 3000000 },
          { date: '2025-12-31', nav: 3150000 }
        ],
        partnershipId: masterworks.id
      }
    ];

    const result: {
      date: Date;
      nav: number;
      partnershipId: string;
      source: string;
    }[] = [];

    for (const s of schedule) {
      for (const n of s.navs) {
        result.push({
          date: new Date(n.date),
          nav: n.nav,
          partnershipId: s.partnershipId,
          source: 'FUND_ADMIN'
        });
      }
    }

    return result;
  }

  /**
   * Build realistic distributions across entity × partnership pairs.
   */
  private buildDistributions({
    entities,
    partnerships
  }: {
    entities: { id: string; name: string }[];
    partnerships: { id: string; name: string }[];
  }): {
    amount: number;
    currency: string;
    date: Date;
    entityId: string;
    partnershipId: string;
    type: string;
  }[] {
    const [trust, holdingsLlc, james, foundation] = entities;
    const [sequoia, blackstone, brookfield, ares, kkr, pimco, masterworks] =
      partnerships;

    return [
      // Trust ← Sequoia
      {
        amount: 450000,
        currency: 'USD',
        date: new Date('2023-06-15'),
        entityId: trust.id,
        partnershipId: sequoia.id,
        type: 'CAPITAL_GAIN'
      },
      {
        amount: 620000,
        currency: 'USD',
        date: new Date('2024-06-15'),
        entityId: trust.id,
        partnershipId: sequoia.id,
        type: 'CAPITAL_GAIN'
      },
      {
        amount: 780000,
        currency: 'USD',
        date: new Date('2025-06-15'),
        entityId: trust.id,
        partnershipId: sequoia.id,
        type: 'CAPITAL_GAIN'
      },

      // Trust ← Blackstone
      {
        amount: 320000,
        currency: 'USD',
        date: new Date('2023-03-31'),
        entityId: trust.id,
        partnershipId: blackstone.id,
        type: 'INCOME'
      },
      {
        amount: 340000,
        currency: 'USD',
        date: new Date('2023-09-30'),
        entityId: trust.id,
        partnershipId: blackstone.id,
        type: 'INCOME'
      },
      {
        amount: 360000,
        currency: 'USD',
        date: new Date('2024-03-31'),
        entityId: trust.id,
        partnershipId: blackstone.id,
        type: 'INCOME'
      },
      {
        amount: 380000,
        currency: 'USD',
        date: new Date('2024-09-30'),
        entityId: trust.id,
        partnershipId: blackstone.id,
        type: 'INCOME'
      },
      {
        amount: 400000,
        currency: 'USD',
        date: new Date('2025-03-31'),
        entityId: trust.id,
        partnershipId: blackstone.id,
        type: 'INCOME'
      },
      {
        amount: 420000,
        currency: 'USD',
        date: new Date('2025-09-30'),
        entityId: trust.id,
        partnershipId: blackstone.id,
        type: 'INCOME'
      },

      // Trust ← Ares
      {
        amount: 210000,
        currency: 'USD',
        date: new Date('2023-06-30'),
        entityId: trust.id,
        partnershipId: ares.id,
        type: 'INTEREST'
      },
      {
        amount: 215000,
        currency: 'USD',
        date: new Date('2023-12-31'),
        entityId: trust.id,
        partnershipId: ares.id,
        type: 'INTEREST'
      },
      {
        amount: 220000,
        currency: 'USD',
        date: new Date('2024-06-30'),
        entityId: trust.id,
        partnershipId: ares.id,
        type: 'INTEREST'
      },
      {
        amount: 225000,
        currency: 'USD',
        date: new Date('2024-12-31'),
        entityId: trust.id,
        partnershipId: ares.id,
        type: 'INTEREST'
      },
      {
        amount: 230000,
        currency: 'USD',
        date: new Date('2025-06-30'),
        entityId: trust.id,
        partnershipId: ares.id,
        type: 'INTEREST'
      },

      // Holdings LLC ← Brookfield
      {
        amount: 180000,
        currency: 'USD',
        date: new Date('2023-09-30'),
        entityId: holdingsLlc.id,
        partnershipId: brookfield.id,
        type: 'INCOME'
      },
      {
        amount: 195000,
        currency: 'USD',
        date: new Date('2024-09-30'),
        entityId: holdingsLlc.id,
        partnershipId: brookfield.id,
        type: 'INCOME'
      },
      {
        amount: 210000,
        currency: 'USD',
        date: new Date('2025-09-30'),
        entityId: holdingsLlc.id,
        partnershipId: brookfield.id,
        type: 'INCOME'
      },

      // Holdings LLC ← KKR
      {
        amount: 275000,
        currency: 'USD',
        date: new Date('2024-06-30'),
        entityId: holdingsLlc.id,
        partnershipId: kkr.id,
        type: 'CAPITAL_GAIN'
      },
      {
        amount: 340000,
        currency: 'USD',
        date: new Date('2025-06-30'),
        entityId: holdingsLlc.id,
        partnershipId: kkr.id,
        type: 'CAPITAL_GAIN'
      },

      // Holdings LLC ← Pimco
      {
        amount: 87500,
        currency: 'USD',
        date: new Date('2023-03-31'),
        entityId: holdingsLlc.id,
        partnershipId: pimco.id,
        type: 'INTEREST'
      },
      {
        amount: 87500,
        currency: 'USD',
        date: new Date('2023-06-30'),
        entityId: holdingsLlc.id,
        partnershipId: pimco.id,
        type: 'INTEREST'
      },
      {
        amount: 90000,
        currency: 'USD',
        date: new Date('2023-09-30'),
        entityId: holdingsLlc.id,
        partnershipId: pimco.id,
        type: 'INTEREST'
      },
      {
        amount: 90000,
        currency: 'USD',
        date: new Date('2023-12-31'),
        entityId: holdingsLlc.id,
        partnershipId: pimco.id,
        type: 'INTEREST'
      },
      {
        amount: 92500,
        currency: 'USD',
        date: new Date('2024-06-30'),
        entityId: holdingsLlc.id,
        partnershipId: pimco.id,
        type: 'INTEREST'
      },
      {
        amount: 95000,
        currency: 'USD',
        date: new Date('2024-12-31'),
        entityId: holdingsLlc.id,
        partnershipId: pimco.id,
        type: 'INTEREST'
      },
      {
        amount: 97500,
        currency: 'USD',
        date: new Date('2025-06-30'),
        entityId: holdingsLlc.id,
        partnershipId: pimco.id,
        type: 'INTEREST'
      },

      // James ← Masterworks
      {
        amount: 55000,
        currency: 'USD',
        date: new Date('2024-12-15'),
        entityId: james.id,
        partnershipId: masterworks.id,
        type: 'RETURN_OF_CAPITAL'
      },

      // Foundation ← KKR
      {
        amount: 120000,
        currency: 'USD',
        date: new Date('2024-06-30'),
        entityId: foundation.id,
        partnershipId: kkr.id,
        type: 'DIVIDEND'
      },
      {
        amount: 145000,
        currency: 'USD',
        date: new Date('2025-06-30'),
        entityId: foundation.id,
        partnershipId: kkr.id,
        type: 'DIVIDEND'
      }
    ];
  }

  /**
   * Build K-1 documents for all partnerships across 3 tax years.
   */
  private buildK1Documents(
    partnerships: { id: string; name: string }[]
  ): {
    data: Record<string, unknown>;
    filingStatus: 'DRAFT' | 'ESTIMATED' | 'FINAL';
    partnershipId: string;
    taxYear: number;
    type: 'K1';
  }[] {
    const [sequoia, blackstone, brookfield, ares, kkr, pimco, masterworks] =
      partnerships;

    return [
      // ── 2023 K-1s — all FINAL ──
      {
        data: this.k1({
          beginningTaxBasis: 8000000,
          capitalGainLossLongTerm: 450000,
          endingGLBalance: 8800000,
          endingTaxBasis: 8420000,
          k1CapitalAccount: 8600000,
          ordinaryIncome: -30000
        }),
        filingStatus: 'FINAL',
        partnershipId: sequoia.id,
        taxYear: 2023,
        type: 'K1'
      },
      {
        data: this.k1({
          beginningTaxBasis: 7000000,
          endingGLBalance: 7500000,
          endingTaxBasis: 7320000,
          k1CapitalAccount: 7400000,
          netRentalIncome: 660000
        }),
        filingStatus: 'FINAL',
        partnershipId: blackstone.id,
        taxYear: 2023,
        type: 'K1'
      },
      {
        data: this.k1({
          beginningTaxBasis: 4200000,
          endingGLBalance: 4500000,
          endingTaxBasis: 4380000,
          interestIncome: 25000,
          k1CapitalAccount: 4450000,
          ordinaryIncome: 180000
        }),
        filingStatus: 'FINAL',
        partnershipId: brookfield.id,
        taxYear: 2023,
        type: 'K1'
      },
      {
        data: this.k1({
          beginningTaxBasis: 6000000,
          endingGLBalance: 6100000,
          endingTaxBasis: 6425000,
          interestIncome: 425000,
          k1CapitalAccount: 6050000
        }),
        filingStatus: 'FINAL',
        partnershipId: ares.id,
        taxYear: 2023,
        type: 'K1'
      },
      {
        data: this.k1({
          beginningTaxBasis: 5500000,
          capitalGainLossLongTerm: 275000,
          endingGLBalance: 5900000,
          endingTaxBasis: 5750000,
          k1CapitalAccount: 5800000,
          ordinaryIncome: -25000
        }),
        filingStatus: 'FINAL',
        partnershipId: kkr.id,
        taxYear: 2023,
        type: 'K1'
      },
      {
        data: this.k1({
          beginningTaxBasis: 5000000,
          dividends: 15000,
          endingGLBalance: 5200000,
          endingTaxBasis: 5355000,
          interestIncome: 355000,
          k1CapitalAccount: 5180000,
          otherAdjustments: -15000
        }),
        filingStatus: 'FINAL',
        partnershipId: pimco.id,
        taxYear: 2023,
        type: 'K1'
      },
      {
        data: this.k1({
          beginningTaxBasis: 2200000,
          endingGLBalance: 2350000,
          endingTaxBasis: 2200000,
          k1CapitalAccount: 2350000
        }),
        filingStatus: 'FINAL',
        partnershipId: masterworks.id,
        taxYear: 2023,
        type: 'K1'
      },

      // ── 2024 K-1s — all FINAL ──
      {
        data: this.k1({
          beginningTaxBasis: 8420000,
          capitalGainLossLongTerm: 620000,
          endingGLBalance: 9500000,
          endingTaxBasis: 9010000,
          k1CapitalAccount: 9300000,
          ordinaryIncome: -30000
        }),
        filingStatus: 'FINAL',
        partnershipId: sequoia.id,
        taxYear: 2024,
        type: 'K1'
      },
      {
        data: this.k1({
          beginningTaxBasis: 7320000,
          endingGLBalance: 7900000,
          endingTaxBasis: 7740000,
          k1CapitalAccount: 7800000,
          netRentalIncome: 740000,
          otherAdjustments: -320000
        }),
        filingStatus: 'FINAL',
        partnershipId: blackstone.id,
        taxYear: 2024,
        type: 'K1'
      },
      {
        data: this.k1({
          beginningTaxBasis: 4380000,
          endingGLBalance: 4800000,
          endingTaxBasis: 4575000,
          interestIncome: 28000,
          k1CapitalAccount: 4750000,
          ordinaryIncome: 195000,
          otherAdjustments: -28000
        }),
        filingStatus: 'FINAL',
        partnershipId: brookfield.id,
        taxYear: 2024,
        type: 'K1'
      },
      {
        data: this.k1({
          beginningTaxBasis: 6425000,
          endingGLBalance: 6300000,
          endingTaxBasis: 6870000,
          interestIncome: 445000,
          k1CapitalAccount: 6250000
        }),
        filingStatus: 'FINAL',
        partnershipId: ares.id,
        taxYear: 2024,
        type: 'K1'
      },
      {
        data: this.k1({
          beginningTaxBasis: 5750000,
          capitalGainLossLongTerm: 340000,
          endingGLBalance: 6400000,
          endingTaxBasis: 6065000,
          k1CapitalAccount: 6300000,
          ordinaryIncome: -25000
        }),
        filingStatus: 'FINAL',
        partnershipId: kkr.id,
        taxYear: 2024,
        type: 'K1'
      },
      {
        data: this.k1({
          beginningTaxBasis: 5355000,
          dividends: 18000,
          endingGLBalance: 5450000,
          endingTaxBasis: 5542500,
          interestIncome: 187500,
          k1CapitalAccount: 5420000
        }),
        filingStatus: 'FINAL',
        partnershipId: pimco.id,
        taxYear: 2024,
        type: 'K1'
      },
      {
        data: this.k1({
          beginningTaxBasis: 2200000,
          endingGLBalance: 2550000,
          endingTaxBasis: 2145000,
          k1CapitalAccount: 2550000,
          otherAdjustments: -55000
        }),
        filingStatus: 'FINAL',
        partnershipId: masterworks.id,
        taxYear: 2024,
        type: 'K1'
      },

      // ── 2025 K-1s — mixed statuses ──
      {
        data: this.k1({
          beginningTaxBasis: 9010000,
          capitalGainLossLongTerm: 780000,
          endingGLBalance: 10400000,
          endingTaxBasis: 9760000,
          k1CapitalAccount: 10200000,
          ordinaryIncome: -30000
        }),
        filingStatus: 'FINAL',
        partnershipId: sequoia.id,
        taxYear: 2025,
        type: 'K1'
      },
      {
        data: this.k1({
          beginningTaxBasis: 7740000,
          endingGLBalance: 8400000,
          endingTaxBasis: 8160000,
          k1CapitalAccount: 8300000,
          netRentalIncome: 820000,
          otherAdjustments: -400000
        }),
        filingStatus: 'ESTIMATED',
        partnershipId: blackstone.id,
        taxYear: 2025,
        type: 'K1'
      },
      {
        data: this.k1({
          beginningTaxBasis: 4575000,
          endingGLBalance: 5100000,
          endingTaxBasis: 4785000,
          interestIncome: 30000,
          k1CapitalAccount: 5050000,
          ordinaryIncome: 210000,
          otherAdjustments: -30000
        }),
        filingStatus: 'ESTIMATED',
        partnershipId: brookfield.id,
        taxYear: 2025,
        type: 'K1'
      },
      {
        data: this.k1({
          beginningTaxBasis: 6870000,
          endingGLBalance: 6500000,
          endingTaxBasis: 7100000,
          interestIncome: 230000,
          k1CapitalAccount: 6450000
        }),
        filingStatus: 'DRAFT',
        partnershipId: ares.id,
        taxYear: 2025,
        type: 'K1'
      },
      {
        data: this.k1({
          beginningTaxBasis: 6065000,
          capitalGainLossLongTerm: 485000,
          endingGLBalance: 7000000,
          endingTaxBasis: 6525000,
          k1CapitalAccount: 6900000,
          ordinaryIncome: -25000
        }),
        filingStatus: 'DRAFT',
        partnershipId: kkr.id,
        taxYear: 2025,
        type: 'K1'
      },
      {
        data: this.k1({
          beginningTaxBasis: 5542500,
          dividends: 20000,
          endingGLBalance: 5700000,
          endingTaxBasis: 5740000,
          interestIncome: 197500,
          k1CapitalAccount: 5680000
        }),
        filingStatus: 'ESTIMATED',
        partnershipId: pimco.id,
        taxYear: 2025,
        type: 'K1'
      },
      {
        data: this.k1({
          beginningTaxBasis: 2145000,
          endingGLBalance: 2750000,
          endingTaxBasis: 2145000,
          k1CapitalAccount: 2750000
        }),
        filingStatus: 'DRAFT',
        partnershipId: masterworks.id,
        taxYear: 2025,
        type: 'K1'
      }
    ];
  }

  private k1(overrides: Record<string, unknown>): Record<string, unknown> {
    return {
      activityNotes: null,
      beginningTaxBasis: 0,
      capitalGainLossLongTerm: 0,
      capitalGainLossShortTerm: 0,
      distributionsProperty: 0,
      dividends: 0,
      endingGLBalance: null,
      endingTaxBasis: 0,
      foreignTaxesPaid: 0,
      guaranteedPayments: 0,
      interestIncome: 0,
      k1CapitalAccount: null,
      netRentalIncome: 0,
      ordinaryIncome: 0,
      otherAdjustments: 0,
      otherDeductions: 0,
      otherIncome: 0,
      otherRentalIncome: 0,
      royalties: 0,
      section1231GainLoss: 0,
      section179Deduction: 0,
      selfEmploymentEarnings: 0,
      unrecaptured1250Gain: 0,
      ...overrides
    };
  }
}
