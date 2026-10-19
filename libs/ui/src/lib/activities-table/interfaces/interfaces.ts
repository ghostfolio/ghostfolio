import { Activity, EnhancedAssetProfile } from '@ghostfolio/common/interfaces';

export interface ActivitiesTableItem
  extends
    Pick<
      Activity,
      | 'currency'
      | 'date'
      | 'fee'
      | 'quantity'
      | 'type'
      | 'unitPrice'
      | 'value'
      | 'valueInBaseCurrency'
    >,
    Partial<
      Pick<Activity, 'account' | 'comment' | 'error' | 'id' | 'tags' | 'tax'>
    > {
  assetProfile: Pick<
    EnhancedAssetProfile,
    'currency' | 'dataSource' | 'name' | 'symbol'
  >;
}
