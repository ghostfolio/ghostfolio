export interface Filter {
  id: string;
  label?: string;
  type:
    | 'ACCOUNT'
    | 'ASSET_CLASS'
    | 'ASSET_SUB_CLASS'
    | 'HOLDING_TYPE'
    | 'PRESET_ID'
    | 'SEARCH_QUERY'
    | 'SYMBOL'
    | 'TAG';
}
