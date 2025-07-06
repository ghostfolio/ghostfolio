import { RuleSettings } from '@ghostfolio/api/models/interfaces/rule-settings.interface';
import { Rule } from '@ghostfolio/api/models/rule';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { I18nService } from '@ghostfolio/api/services/i18n/i18n.service';
import { PortfolioPosition, UserSettings } from '@ghostfolio/common/interfaces';

export class AssetClassClusterRiskFixedIncome extends Rule<Settings> {
  private holdings: PortfolioPosition[];

  public constructor(
    protected exchangeRateDataService: ExchangeRateDataService,
    private i18nService: I18nService,
    languageCode: string,
    holdings: PortfolioPosition[]
  ) {
    super(exchangeRateDataService, {
      languageCode,
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
        evaluation: this.i18nService.getTranslation({
          id: 'rule.assetClassClusterRiskFixedIncome.false.max',
          languageCode: this.getLanguageCode(),
          placeholders: {
            fixedIncomeValueRatio: (fixedIncomeValueRatio * 100).toPrecision(3),
            thresholdMax: (ruleSettings.thresholdMax * 100).toPrecision(3)
          }
        }),
        value: false
      };
    } else if (fixedIncomeValueRatio < ruleSettings.thresholdMin) {
      return {
        evaluation: this.i18nService.getTranslation({
          id: 'rule.assetClassClusterRiskFixedIncome.false.min',
          languageCode: this.getLanguageCode(),
          placeholders: {
            fixedIncomeValueRatio: (fixedIncomeValueRatio * 100).toPrecision(3),
            thresholdMin: (ruleSettings.thresholdMin * 100).toPrecision(3)
          }
        }),
        value: false
      };
    }
    return {
      evaluation: this.i18nService.getTranslation({
        id: 'rule.assetClassClusterRiskFixedIncome.true',
        languageCode: this.getLanguageCode(),
        placeholders: {
          fixedIncomeValueRatio: (fixedIncomeValueRatio * 100).toPrecision(3),
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
      id: 'rule.assetClassClusterRiskFixedIncome',
      languageCode: this.getLanguageCode()
    });
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
