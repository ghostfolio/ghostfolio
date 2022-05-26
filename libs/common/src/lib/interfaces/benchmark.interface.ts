import { EnhancedSymbolProfile } from '@ghostfolio/api/services/interfaces/symbol-profile.interface';

export interface Benchmark {
  name: EnhancedSymbolProfile['name'];
  performances: {
    allTimeHigh: {
      performancePercent: number;
    };
  };
}
