import { Currency } from '@prisma/client';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data.service';
import { PortfolioPosition } from '@ghostfolio/common/interfaces';

import { Rule } from '../../rule';
import { UserSettings } from '@ghostfolio/api/models/interfaces/user-settings.interface';
import { RuleSettings } from '@ghostfolio/api/models/interfaces/rule-settings.interface';

export class CurrencyClusterRiskBaseCurrencyCurrentInvestment extends Rule<Settings> {
  public constructor(
    protected exchangeRateDataService: ExchangeRateDataService,
    private positions: { [symbol: string]: PortfolioPosition }
  ) {
    super(exchangeRateDataService, {
      name: 'Current Investment: Base Currency'
    });
  }

  public evaluate(ruleSettings: Settings) {
    const positionsGroupedByCurrency = this.groupPositionsByAttribute(
      this.positions,
      'currency',
      ruleSettings.baseCurrency
    );

    let maxItem = positionsGroupedByCurrency[0];
    let totalValue = 0;

    positionsGroupedByCurrency.forEach((groupItem) => {
      // Calculate total value
      totalValue += groupItem.value;

      // Find maximum
      if (groupItem.investment > maxItem.investment) {
        maxItem = groupItem;
      }
    });

    const baseCurrencyItem = positionsGroupedByCurrency.find((item) => {
      return item.groupKey === ruleSettings.baseCurrency;
    });

    const baseCurrencyValueRatio = baseCurrencyItem?.value / totalValue || 0;

    if (maxItem.groupKey !== ruleSettings.baseCurrency) {
      return {
        evaluation: `The major part of your current investment is not in your base currency (${(
          baseCurrencyValueRatio * 100
        ).toPrecision(3)}% in ${ruleSettings.baseCurrency})`,
        value: false
      };
    }

    return {
      evaluation: `The major part of your current investment is in your base currency (${(
        baseCurrencyValueRatio * 100
      ).toPrecision(3)}% in ${ruleSettings.baseCurrency})`,
      value: true
    };
  }

  public getSettings(aUserSettings: UserSettings): Settings {
    return {
      baseCurrency: aUserSettings.baseCurrency,
      isActive: true
    };
  }
}

interface Settings extends RuleSettings {
  baseCurrency: Currency;
}
