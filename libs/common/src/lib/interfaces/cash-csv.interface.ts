export interface CashCsvPreview {
  accountId: string;
  currency: string;
  revision: number;
  digest: string;
  rows: {
    line: number;
    date: string;
    operation: string;
    amount: string;
    status: 'NEW' | 'EXISTING' | 'ERROR';
    message: string;
    candidates?: { id: string; label: string }[];
  }[];
  errors: string[];
  warnings: string[];
  newCount: number;
  existingCount: number;
  finalBalance: string;
  minimumBalance: string;
  firstAffectedDate?: string;
}
