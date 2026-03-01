import type { AccessService } from '@ghostfolio/api/app/access/access.service';
import type { AccountBalanceService } from '@ghostfolio/api/app/account-balance/account-balance.service';
import type { AccountService } from '@ghostfolio/api/app/account/account.service';
import type { ExportService } from '@ghostfolio/api/app/export/export.service';
import type { ImportService } from '@ghostfolio/api/app/import/import.service';
import type { OrderService } from '@ghostfolio/api/app/order/order.service';
import type { PlatformService } from '@ghostfolio/api/app/platform/platform.service';
import type { PortfolioService } from '@ghostfolio/api/app/portfolio/portfolio.service';
import type { RedisCacheService } from '@ghostfolio/api/app/redis-cache/redis-cache.service';
import type { SymbolService } from '@ghostfolio/api/app/symbol/symbol.service';
import type { UserService } from '@ghostfolio/api/app/user/user.service';
import type { BenchmarkService } from '@ghostfolio/api/services/benchmark/benchmark.service';
import type { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import type { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import type { MarketDataService } from '@ghostfolio/api/services/market-data/market-data.service';
import type { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import type { DataGatheringService } from '@ghostfolio/api/services/queues/data-gathering/data-gathering.service';
import type { SymbolProfileService } from '@ghostfolio/api/services/symbol-profile/symbol-profile.service';
import type { TagService } from '@ghostfolio/api/services/tag/tag.service';
import type { UserWithSettings } from '@ghostfolio/common/types';

import type { WatchlistService } from '../../watchlist/watchlist.service';

export interface ToolDependencies {
  accessService: AccessService;
  accountBalanceService: AccountBalanceService;
  accountService: AccountService;
  benchmarkService: BenchmarkService;
  dataGatheringService: DataGatheringService;
  dataProviderService: DataProviderService;
  exchangeRateDataService: ExchangeRateDataService;
  exportService: ExportService;
  importService: ImportService;
  marketDataService: MarketDataService;
  orderService: OrderService;
  platformService: PlatformService;
  portfolioService: PortfolioService;
  prismaService?: PrismaService;
  symbolProfileService: SymbolProfileService;
  symbolService: SymbolService;
  tagService: TagService;
  userService: UserService;
  watchlistService: WatchlistService;
  redisCacheService?: RedisCacheService;
  user: UserWithSettings;
  requestCache: Map<string, Promise<unknown>>;
}
