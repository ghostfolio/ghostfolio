import { RuleSettings } from '@ghostfolio/api/models/interfaces/rule-settings.interface';
import { Rule } from '@ghostfolio/api/models/rule';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { I18nService } from '@ghostfolio/api/services/i18n/i18n.service';
import { PortfolioPosition, UserSettings } from '@ghostfolio/common/interfaces';

export class AssetClassClusterRiskEquity extends Rule<Settings> {
  private holdings: PortfolioPosition[];

  public constructor(
    protected exchangeRateDataService: ExchangeRateDataService,
    private i18nService: I18nService,
    languageCode: string,
    holdings: PortfolioPosition[]
  ) {
    super(exchangeRateDataService, {
      languageCode,
      key: AssetClassClusterRiskEquity.name
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
        evaluation: this.i18nService.getTranslation({
          id: 'rule.assetClassClusterRiskEquity.false.max',
          languageCode: this.getLanguageCode(),
          placeholders: {
            equityValueRatio: (equityValueRatio * 100).toPrecision(3),
            thresholdMax: (ruleSettings.thresholdMax * 100).toPrecision(3)
          }
        }),
        value: false
      };
    } else if (equityValueRatio < ruleSettings.thresholdMin) {
      return {
        evaluation: this.i18nService.getTranslation({
          id: 'rule.assetClassClusterRiskEquity.false.min',
          languageCode: this.getLanguageCode(),
          placeholders: {
            equityValueRatio: (equityValueRatio * 100).toPrecision(3),
            thresholdMin: (ruleSettings.thresholdMin * 100).toPrecision(3)
          }
        }),
        value: false
      };
    }
    return {
      evaluation: this.i18nService.getTranslation({
        id: 'rule.assetClassClusterRiskEquity.true',
        languageCode: this.getLanguageCode(),
        placeholders: {
          equityValueRatio: (equityValueRatio * 100).toPrecision(3),
          thresholdMax: (ruleSettings.thresholdMax * 100).toPrecision(3),
          thresholdMin: (ruleSettings.thresholdMin * 100).toPrecision(3)
        }
      }),
      value: true
    };
  }

  public getCategoryName() {
    return this.i18nService.getTranslation({
      id: 'rule.assetClassClusterRisk.category',
      languageCode: this.getLanguageCode()
    });
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
    return this.i18nService.getTranslation({
      id: 'rule.assetClassClusterRiskEquity',
      languageCode: this.getLanguageCode()
    });
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
