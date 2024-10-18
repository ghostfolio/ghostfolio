import { RuleSettings } from '@ghostfolio/api/models/interfaces/rule-settings.interface';
import { Rule } from '@ghostfolio/api/models/rule';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { UserSettings } from '@ghostfolio/common/interfaces';

export class AllocationClusterRiskEmergingMarkets extends Rule<Settings> {
  private emergingMarketsValueInBaseCurrency: number;
  private totalInvestment: number;

  public constructor(
    protected exchangeRateDataService: ExchangeRateDataService,
    totalInvestment: number,
    emergingMarketsValueInBaseCurrency: number
  ) {
    super(exchangeRateDataService, {
      key: AllocationClusterRiskEmergingMarkets.name,
      name: 'Emerging Markets'
    });

    this.emergingMarketsValueInBaseCurrency =
      emergingMarketsValueInBaseCurrency;
    this.totalInvestment = totalInvestment;
  }

  public evaluate(ruleSettings: Settings) {
    const emergingMarketsValueRatio = this.totalInvestment
      ? this.emergingMarketsValueInBaseCurrency / this.totalInvestment
      : 0;

    if (emergingMarketsValueRatio > ruleSettings.thresholdMax) {
      return {
        evaluation: `The emerging markets contribution exceed ${(
          ruleSettings.thresholdMax * 100
        ).toPrecision(
          3
        )}% of your initial investment (${(emergingMarketsValueRatio * 100).toPrecision(3)}%)`,
        value: false
      };
    } else if (emergingMarketsValueRatio < ruleSettings.thresholdMin) {
      return {
        evaluation: `The emerging markets contribution does not exceed ${(
          ruleSettings.thresholdMin * 100
        ).toPrecision(
          3
        )}% of your initial investment (${(emergingMarketsValueRatio * 100).toPrecision(3)}%)`,
        value: false
      };
    }

    return {
      evaluation: `The emerging markets contribution does not exceed ${
        ruleSettings.thresholdMax * 100
      }% of your initial investment (${(emergingMarketsValueRatio * 100).toPrecision(3)}%)`,
      value: true
    };
  }

  public getConfiguration() {
    return {
      threshold: {
        max: 1,
        min: 0,
        step: 0.0025,
        unit: '%'
      },
      thresholdMax: true
    };
  }

  public getSettings({ baseCurrency, xRayRules }: UserSettings): Settings {
    return {
      baseCurrency,
      isActive: xRayRules?.[this.getKey()]?.isActive ?? true,
      thresholdMax: xRayRules?.[this.getKey()]?.thresholdMax ?? 0.32,
      thresholdMin: xRayRules?.[this.getKey()]?.thresholdMin ?? 0.28
    };
  }
}

interface Settings extends RuleSettings {
  baseCurrency: string;
  thresholdMin: number;
  thresholdMax: number;
}
