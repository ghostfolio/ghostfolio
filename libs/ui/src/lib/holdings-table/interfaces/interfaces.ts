import { PortfolioPosition } from '@ghostfolio/common/interfaces';

export interface HoldingTablePosition
  extends
    Pick<
      PortfolioPosition,
      | 'allocationInPercentage'
      | 'assetProfile'
      | 'dateOfFirstActivity'
      | 'markets'
      | 'netPerformancePercentWithCurrencyEffect'
      | 'valueInPercentage'
    >,
    Partial<
      Pick<
        PortfolioPosition,
        'netPerformanceWithCurrencyEffect' | 'quantity' | 'valueInBaseCurrency'
      >
    > {}
