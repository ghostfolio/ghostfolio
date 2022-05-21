export interface Filter {
  id: string;
  label?: string;
  type: 'ACCOUNT' | 'ASSET_CLASS' | 'SYMBOL' | 'TAG';
}
