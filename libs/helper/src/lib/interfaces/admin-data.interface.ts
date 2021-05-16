export interface AdminData {
  exchangeRates: { label1: string; label2: string; value: number }[];
  lastDataGathering: Date | 'IN_PROGRESS';
  transactionCount: number;
  userCount: number;
  users: {
    alias: string;
    createdAt: Date;
    Analytics: {
      activityCount: number;
      updatedAt: Date;
    };
    id: string;
  }[];
}
