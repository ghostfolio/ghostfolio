import { Rule } from '@ghostfolio/api/models/rule';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { I18nService } from '@ghostfolio/api/services/i18n/i18n.service';
import { PortfolioPosition, RuleSettings } from '@ghostfolio/common/interfaces';

export class AssetClassClusterRiskEquity extends Rule<Settings> {
  private holdings: PortfolioPosition[];
  private i18nService: I18nService;

  public constructor({
    exchangeRateDataService,
    holdings,
    i18nService,
    languageCode
  }: {
    exchangeRateDataService: ExchangeRateDataService;
    holdings: PortfolioPosition[];
    i18nService: I18nService;
    languageCode: string;
  }) {
    super(exchangeRateDataService, {
      languageCode,
      key: 'AssetClassClusterRiskEquity'
    });

    this.holdings = holdings;
    this.i18nService = i18nService;
  }

  public evaluate(ruleSettings: Settings) {
    const holdingsGroupedByAssetClass = this.groupCurrentHoldingsByAttribute(
      this.holdings,
      'assetProfile.assetClass',
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
}

interface Settings extends RuleSettings {
  baseCurrency: string;
  thresholdMin: number;
  thresholdMax: number;
}
