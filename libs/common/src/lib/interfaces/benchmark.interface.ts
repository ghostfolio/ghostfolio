import { BenchmarkTrend } from '@ghostfolio/common/types/';

import { EnhancedSymbolProfile } from './enhanced-symbol-profile.interface';
import { MarketSentiment } from './market-sentiment.interface';

export interface Benchmark {
  dataSource: EnhancedSymbolProfile['dataSource'];
  marketCondition: 'ALL_TIME_HIGH' | 'BEAR_MARKET' | 'NEUTRAL_MARKET';
  marketSentiment?: MarketSentiment;
  name: EnhancedSymbolProfile['name'];
  performances: {
    allTimeHigh: {
      date: Date;
      performancePercent: number;
    };
  };
  symbol: EnhancedSymbolProfile['symbol'];
  trend50d: BenchmarkTrend;
  trend200d: BenchmarkTrend;
}
