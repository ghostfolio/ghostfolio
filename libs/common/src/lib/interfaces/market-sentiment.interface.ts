export type MarketSentimentAlignment =
  | 'ALIGNED'
  | 'DIVERGENT'
  | 'MIXED'
  | 'SINGLE_SOURCE';

export type MarketSentimentSourceName = 'NEWS' | 'POLYMARKET' | 'REDDIT' | 'X';

export type MarketSentimentTrend = 'FALLING' | 'MIXED' | 'RISING' | 'STABLE';

export interface MarketSentimentSource {
  activityCount: number;
  bullishPct?: number;
  buzzScore: number;
  source: MarketSentimentSourceName;
  trend?: Exclude<MarketSentimentTrend, 'MIXED'>;
}

export interface MarketSentiment {
  averageBullishPct?: number;
  averageBuzzScore: number;
  coverage: number;
  sourceAlignment: MarketSentimentAlignment;
  sourceMetrics: MarketSentimentSource[];
  trend: MarketSentimentTrend;
}
