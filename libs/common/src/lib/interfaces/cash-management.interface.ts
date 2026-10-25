export type CashEventInput = {
  comment?: string | null;
  fee?: string;
  date: string;
} & (
  { amount: string; type: 'MOVEMENT' } | { balance: string; type: 'CHECKPOINT' }
);

export type ManagedCashEvent = CashEventInput & {
  id: string;
  importReference?: string;
  sequence: number;
  orderId?: string;
  transferId?: string;
  transferCounterparty?: {
    accountId: string;
    mode: 'CASH' | 'LEGACY';
    amount: string;
    currency: string;
  };
};

export interface CashManagementSnapshot {
  exchangeRateToBaseCurrency?: number;
  accountId: string;
  balances: { date: string; value: string }[];
  currency: string;
  defaultUpdateCash: boolean;
  includeCashInPortfolio?: boolean;
  isAutomaticOpening?: boolean;
  events: ManagedCashEvent[];
  minimumBalance: { date: string; sequence: number; value: string };
  openingBalance: { balance: string; date: string; sequence: number };
  revision: number;
}

export interface CashManagementExport {
  currency: string;
  defaultUpdateCash: boolean;
  includeCashInPortfolio?: boolean;
  isAutomaticOpening?: boolean;
  events: ManagedCashEvent[];
  openingBalance: { balance: string; date: string; sequence: number };
  version: 1;
}

export interface CashConfirmation {
  confirmNegativeBalance?: boolean;
  cashRevisions?: Record<string, number>;
}
