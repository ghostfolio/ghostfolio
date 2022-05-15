export interface Filter {
  id: string;
  label?: string;
  type: 'ACCOUNT' | 'SYMBOL' | 'TAG';
}
