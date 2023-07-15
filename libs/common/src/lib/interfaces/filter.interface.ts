export interface Filter {
  id: string;
  label?: string;
  type:
    | 'ACCOUNT'
    | 'ASSET_CLASS'
    | 'ASSET_SUB_CLASS'
    | 'QUERY_ID'
    | 'SYMBOL'
    | 'TAG';
}
