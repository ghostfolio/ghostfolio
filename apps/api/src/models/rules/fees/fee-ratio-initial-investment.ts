import { PortfolioPosition } from '@ghostfolio/common/interfaces';
import { ExchangeRateDataService } from 'apps/api/src/services/exchange-rate-data.service';

import { Rule } from '../../rule';

export class FeeRatioInitialInvestment extends Rule {
  public constructor(public exchangeRateDataService: ExchangeRateDataService) {
    super(exchangeRateDataService, {
      name: 'Initial Investment'
    });
  }

  public evaluate(
    aPositions: { [symbol: string]: PortfolioPosition },
    aFees: number,
    aRuleSettingsMap?: {
      [key: string]: any;
    }
  ) {
    const ruleSettings = aRuleSettingsMap[FeeRatioInitialInvestment.name];

    const positionsGroupedByCurrency = this.groupPositionsByAttribute(
      aPositions,
      'currency',
      ruleSettings.baseCurrency
    );

    let totalInvestment = 0;

    positionsGroupedByCurrency.forEach((groupItem) => {
      // Calculate total investment
      totalInvestment += groupItem.investment;
    });

    const feeRatio = aFees / totalInvestment;

    if (feeRatio > ruleSettings.threshold) {
      return {
        evaluation: `The fees do exceed ${
          ruleSettings.threshold * 100
        }% of your initial investment (${(feeRatio * 100).toPrecision(3)}%)`,
        value: false
      };
    }

    return {
      evaluation: `The fees do not exceed ${
        ruleSettings.threshold * 100
      }% of your initial investment (${(feeRatio * 100).toPrecision(3)}%)`,
      value: true
    };
  }
}
