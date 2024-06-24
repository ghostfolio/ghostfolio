import { RuleSettings } from '@ghostfolio/api/models/interfaces/rule-settings.interface';
import { Rule } from '@ghostfolio/api/models/rule';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { UserSettings } from '@ghostfolio/common/interfaces';
import { TimelinePosition } from '@ghostfolio/common/models';

export class CurrencyClusterRiskCurrentInvestment extends Rule<Settings> {
  private positions: TimelinePosition[];

  public constructor(
    protected exchangeRateDataService: ExchangeRateDataService,
    positions: TimelinePosition[]
  ) {
    super(exchangeRateDataService, {
      key: CurrencyClusterRiskCurrentInvestment.name,
      name: 'Investment'
    });

    this.positions = positions;
  }

  public evaluate(ruleSettings: Settings) {
    const positionsGroupedByCurrency = this.groupCurrentPositionsByAttribute(
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

  public getSettings(aUserSettings: UserSettings): Settings {
    return {
      baseCurrency: aUserSettings.baseCurrency,
      isActive: aUserSettings.xRayRules[this.getKey()].isActive,
      thresholdMax: 0.5
    };
  }
}

interface Settings extends RuleSettings {
  baseCurrency: string;
  thresholdMax: number;
}
