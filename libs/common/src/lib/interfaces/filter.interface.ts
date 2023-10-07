export interface Filter {
  id: string;
  label?: string;
  type:
    | 'ACCOUNT'
    | 'ASSET_CLASS'
    | 'ASSET_SUB_CLASS'
    | 'PRESET_ID'
    | 'SEARCH_QUERY'
    | 'SYMBOL'
    | 'TAG';
}
