import { RuleSettings } from '@ghostfolio/api/models/interfaces/rule-settings.interface';
import { Rule } from '@ghostfolio/api/models/rule';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { PortfolioPosition, UserSettings } from '@ghostfolio/common/interfaces';

export class AssetClassClusterRiskFixedIncome extends Rule<Settings> {
  private holdings: PortfolioPosition[];

  public constructor(
    protected exchangeRateDataService: ExchangeRateDataService,
    holdings: PortfolioPosition[]
  ) {
    super(exchangeRateDataService, {
      key: AssetClassClusterRiskFixedIncome.name
    });

    this.holdings = holdings;
  }

  public evaluate(ruleSettings: Settings) {
    const holdingsGroupedByAssetClass = this.groupCurrentHoldingsByAttribute(
      this.holdings,
      'assetClass',
      ruleSettings.baseCurrency
    );
    let totalValue = 0;

    const fixedIncomeValueInBaseCurrency =
      holdingsGroupedByAssetClass.find(({ groupKey }) => {
        return groupKey === 'FIXED_INCOME';
      })?.value ?? 0;

    for (const { value } of holdingsGroupedByAssetClass) {
      totalValue += value;
    }

    const fixedIncomeValueRatio = totalValue
      ? fixedIncomeValueInBaseCurrency / totalValue
      : 0;

    if (fixedIncomeValueRatio > ruleSettings.thresholdMax) {
      return {
        evaluation: `The fixed income contribution of your current investment (${(fixedIncomeValueRatio * 100).toPrecision(3)}%) exceeds ${(
          ruleSettings.thresholdMax * 100
        ).toPrecision(3)}%`,
        value: false
      };
    } else if (fixedIncomeValueRatio < ruleSettings.thresholdMin) {
      return {
        evaluation: `The fixed income contribution of your current investment (${(fixedIncomeValueRatio * 100).toPrecision(3)}%) is below ${(
          ruleSettings.thresholdMin * 100
        ).toPrecision(3)}%`,
        value: false
      };
    }

    return {
      evaluation: `The fixed income contribution of your current investment (${(fixedIncomeValueRatio * 100).toPrecision(3)}%) is within the range of ${(
        ruleSettings.thresholdMin * 100
      ).toPrecision(
        3
      )}% and ${(ruleSettings.thresholdMax * 100).toPrecision(3)}%`,
      value: true
    };
  }

  public getConfiguration() {
    return {
      threshold: {
        max: 1,
        min: 0,
        step: 0.01,
        unit: '%'
      },
      thresholdMax: true,
      thresholdMin: true
    };
  }

  public getName() {
    return 'Fixed Income';
  }

  public getSettings({ baseCurrency, xRayRules }: UserSettings): Settings {
    return {
      baseCurrency,
      isActive: xRayRules?.[this.getKey()]?.isActive ?? true,
      thresholdMax: xRayRules?.[this.getKey()]?.thresholdMax ?? 0.22,
      thresholdMin: xRayRules?.[this.getKey()]?.thresholdMin ?? 0.18
    };
  }
}

interface Settings extends RuleSettings {
  baseCurrency: string;
  thresholdMin: number;
  thresholdMax: number;
}
