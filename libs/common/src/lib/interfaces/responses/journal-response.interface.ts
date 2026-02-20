export interface JournalEntryItem {
  date: string;
  note?: string;
}

export interface JournalCalendarDataItem {
  activitiesCount: number;
  date: string;
  hasNote: boolean;
  netPerformance: number;
  netPerformanceInPercentage: number;
  realizedProfit: number;
  value: number;
}

export interface JournalResponse {
  days: JournalCalendarDataItem[];
  stats: JournalStats;
}

export interface JournalStats {
  averageDailyPnL: number;
  largestLoss: number;
  largestProfit: number;
  losingDays: number;
  maxConsecutiveLosses: number;
  maxConsecutiveWins: number;
  totalTradingDays: number;
  winningDays: number;
}
