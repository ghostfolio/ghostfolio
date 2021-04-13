import { PortfolioPosition } from 'apps/api/src/app/portfolio/interfaces/portfolio-position.interface';
import { ExchangeRateDataService } from 'apps/api/src/services/exchange-rate-data.service';

import { Rule } from '../../rule';

export class CurrencyClusterRiskBaseCurrencyInitialInvestment extends Rule {
  public constructor(public exchangeRateDataService: ExchangeRateDataService) {
    super(exchangeRateDataService, {
      name: 'Initial Investment: Base Currency'
    });
  }

  public evaluate(
    aPositions: { [symbol: string]: PortfolioPosition },
    aFees: number,
    aRuleSettingsMap?: {
      [key: string]: any;
    }
  ) {
    const ruleSettings =
      aRuleSettingsMap[CurrencyClusterRiskBaseCurrencyInitialInvestment.name];

    const positionsGroupedByCurrency = this.groupPositionsByAttribute(
      aPositions,
      'currency',
      ruleSettings.baseCurrency
    );

    let maxItem = positionsGroupedByCurrency[0];
    let totalInvestment = 0;

    positionsGroupedByCurrency.forEach((groupItem) => {
      // Calculate total investment
      totalInvestment += groupItem.investment;

      // Find maximum
      if (groupItem.investment > maxItem.investment) {
        maxItem = groupItem;
      }
    });

    const baseCurrencyItem = positionsGroupedByCurrency.find((item) => {
      return item.groupKey === ruleSettings.baseCurrency;
    });

    const baseCurrencyInvestmentRatio =
      baseCurrencyItem?.investment / totalInvestment || 0;

    if (maxItem.groupKey !== ruleSettings.baseCurrency) {
      return {
        evaluation: `The major part of your initial investment is not in your base currency (${(
          baseCurrencyInvestmentRatio * 100
        ).toPrecision(3)}% in ${ruleSettings.baseCurrency})`,
        value: false
      };
    }

    return {
      evaluation: `The major part of your initial investment is in your base currency (${(
        baseCurrencyInvestmentRatio * 100
      ).toPrecision(3)}% in ${ruleSettings.baseCurrency})`,
      value: true
    };
  }
}
