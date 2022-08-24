export interface Filter {
  id: string;
  label?: string;
  type: 'ACCOUNT' | 'ASSET_CLASS' | 'ASSET_SUB_CLASS' | 'SYMBOL' | 'TAG';
}
