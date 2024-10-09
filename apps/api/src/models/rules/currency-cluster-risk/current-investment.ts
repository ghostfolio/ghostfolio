import { RuleSettings } from '@ghostfolio/api/models/interfaces/rule-settings.interface';
import { Rule } from '@ghostfolio/api/models/rule';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { PortfolioPosition, UserSettings } from '@ghostfolio/common/interfaces';

export class CurrencyClusterRiskCurrentInvestment extends Rule<Settings> {
  private holdings: PortfolioPosition[];

  public constructor(
    protected exchangeRateDataService: ExchangeRateDataService,
    holdings: PortfolioPosition[]
  ) {
    super(exchangeRateDataService, {
      key: CurrencyClusterRiskCurrentInvestment.name,
      name: 'Investment'
    });

    this.holdings = holdings;
  }

  public evaluate(ruleSettings: Settings) {
    const holdingsGroupedByCurrency = this.groupCurrentHoldingsByAttribute(
      this.holdings,
      'currency',
      ruleSettings.baseCurrency
    );

    let maxItem = holdingsGroupedByCurrency[0];
    let totalValue = 0;

    holdingsGroupedByCurrency.forEach((groupItem) => {
      // Calculate total value
      totalValue += groupItem.value;

      // Find maximum
      if (groupItem.value > maxItem.value) {
        maxItem = groupItem;
      }
    });

    const maxValueRatio = maxItem?.value / totalValue || 0;

    if (maxValueRatio > ruleSettings.thresholdMax) {
      return {
        evaluation: `Over ${
          ruleSettings.thresholdMax * 100
        }% of your current investment is in ${maxItem.groupKey} (${(
          maxValueRatio * 100
        ).toPrecision(3)}%)`,
        value: false
      };
    }

    return {
      evaluation: `The major part of your current investment is in ${
        maxItem?.groupKey ?? ruleSettings.baseCurrency
      } (${(maxValueRatio * 100).toPrecision(3)}%) and does not exceed ${
        ruleSettings.thresholdMax * 100
      }%`,
      value: true
    };
  }

  public getSettings({ baseCurrency, xRayRules }: UserSettings): Settings {
    return {
      baseCurrency,
      isActive: xRayRules?.[this.getKey()].isActive ?? true,
      thresholdMax: xRayRules?.[this.getKey()]?.thresholdMax ?? 0.5
    };
  }
}

interface Settings extends RuleSettings {
  baseCurrency: string;
  thresholdMax: number;
}
