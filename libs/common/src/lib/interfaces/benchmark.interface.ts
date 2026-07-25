import { BenchmarkTrend } from '@ghostfolio/common/types/';

import { EnhancedAssetProfile } from './enhanced-asset-profile.interface';

export interface Benchmark {
  dataSource: EnhancedAssetProfile['dataSource'];
  marketCondition: 'ALL_TIME_HIGH' | 'BEAR_MARKET' | 'NEUTRAL_MARKET';
  name: EnhancedAssetProfile['name'];
  performances: {
    allTimeHigh: {
      date: Date;
      performancePercent: number;
    };
  };
  symbol: EnhancedAssetProfile['symbol'];
  trend50d: BenchmarkTrend;
  trend200d: BenchmarkTrend;
}
