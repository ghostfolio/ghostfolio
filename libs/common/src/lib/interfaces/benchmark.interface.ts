import { EnhancedSymbolProfile } from './enhanced-symbol-profile.interface';

export interface Benchmark {
  name: EnhancedSymbolProfile['name'];
  performances: {
    allTimeHigh: {
      performancePercent: number;
    };
  };
}
