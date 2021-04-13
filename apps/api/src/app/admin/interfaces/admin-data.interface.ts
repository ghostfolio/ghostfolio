export interface AdminData {
  analytics: {
    activityCount: number;
    updatedAt: Date;
    User: {
      alias: string;
      id: string;
    };
  }[];
  exchangeRates: { label1: string; label2: string; value: number }[];
  lastDataGathering: Date | 'IN_PROGRESS';
  transactionCount: number;
  userCount: number;
}
