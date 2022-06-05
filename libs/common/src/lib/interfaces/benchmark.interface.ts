import { EnhancedSymbolProfile } from './enhanced-symbol-profile.interface';

export interface Benchmark {
  marketCondition: 'BEAR_MARKET' | 'BULL_MARKET' | 'NEUTRAL_MARKET';
  name: EnhancedSymbolProfile['name'];
  performances: {
    allTimeHigh: {
      performancePercent: number;
    };
  };
}
