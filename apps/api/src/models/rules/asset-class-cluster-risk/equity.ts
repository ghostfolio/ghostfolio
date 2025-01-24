import { RuleSettings } from '@ghostfolio/api/models/interfaces/rule-settings.interface';
import { Rule } from '@ghostfolio/api/models/rule';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { PortfolioPosition, UserSettings } from '@ghostfolio/common/interfaces';

export class AssetClassClusterRiskEquity extends Rule<Settings> {
  private holdings: PortfolioPosition[];

  public constructor(
    protected exchangeRateDataService: ExchangeRateDataService,
    holdings: PortfolioPosition[]
  ) {
    super(exchangeRateDataService, {
      key: AssetClassClusterRiskEquity.name,
      name: 'Equity'
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

    const equityValueInBaseCurrency =
      holdingsGroupedByAssetClass.find(({ groupKey }) => {
        return groupKey === 'EQUITY';
      })?.value ?? 0;

    for (const { value } of holdingsGroupedByAssetClass) {
      totalValue += value;
    }

    const equityValueRatio = totalValue
      ? equityValueInBaseCurrency / totalValue
      : 0;

    if (equityValueRatio > ruleSettings.thresholdMax) {
      return {
        evaluation: `The equity contribution of your current investment (${(equityValueRatio * 100).toPrecision(3)}%) exceeds ${(
          ruleSettings.thresholdMax * 100
        ).toPrecision(3)}%`,
        value: false
      };
    } else if (equityValueRatio < ruleSettings.thresholdMin) {
      return {
        evaluation: `The equity contribution of your current investment (${(equityValueRatio * 100).toPrecision(3)}%) is below ${(
          ruleSettings.thresholdMin * 100
        ).toPrecision(3)}%`,
        value: false
      };
    }

    return {
      evaluation: `The equity contribution of your current investment (${(equityValueRatio * 100).toPrecision(3)}%) is within the range of ${(
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

  public getSettings({ baseCurrency, xRayRules }: UserSettings): Settings {
    return {
      baseCurrency,
      isActive: xRayRules?.[this.getKey()]?.isActive ?? true,
      thresholdMax: xRayRules?.[this.getKey()]?.thresholdMax ?? 0.82,
      thresholdMin: xRayRules?.[this.getKey()]?.thresholdMin ?? 0.78
    };
  }
}

interface Settings extends RuleSettings {
  baseCurrency: string;
  thresholdMin: number;
  thresholdMax: number;
}
