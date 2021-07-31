import { PortfolioPosition } from '@ghostfolio/common/interfaces';
import { ExchangeRateDataService } from 'apps/api/src/services/exchange-rate-data.service';

import { Rule } from '../../rule';
import { UserSettings } from '@ghostfolio/api/models/interfaces/user-settings.interface';
import { Currency } from '@prisma/client';
import { RuleSettings } from '@ghostfolio/api/models/interfaces/rule-settings.interface';

export class CurrencyClusterRiskCurrentInvestment extends Rule<Settings> {
  public constructor(
    public exchangeRateDataService: ExchangeRateDataService,
    private positions: { [symbol: string]: PortfolioPosition }
  ) {
    super(exchangeRateDataService, {
      name: 'Current Investment'
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
      if (groupItem.value > maxItem.value) {
        maxItem = groupItem;
      }
    });

    const maxValueRatio = maxItem.value / totalValue;

    if (maxValueRatio > ruleSettings.threshold) {
      return {
        evaluation: `Over ${
          ruleSettings.threshold * 100
        }% of your current investment is in ${maxItem.groupKey} (${(
          maxValueRatio * 100
        ).toPrecision(3)}%)`,
        value: false
      };
    }

    return {
      evaluation: `The major part of your current investment is in ${
        maxItem.groupKey
      } (${(maxValueRatio * 100).toPrecision(3)}%) and does not exceed ${
        ruleSettings.threshold * 100
      }%`,
      value: true
    };
  }

  public getSettings(aUserSettings: UserSettings): Settings {
    return {
      baseCurrency: aUserSettings.baseCurrency,
      isActive: true,
      threshold: 0.5
    };
  }
}

interface Settings extends RuleSettings {
  baseCurrency: Currency;
  threshold: number;
}
