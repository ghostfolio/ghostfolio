import { RuleSettings } from '@ghostfolio/api/models/interfaces/rule-settings.interface';
import { Rule } from '@ghostfolio/api/models/rule';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { I18nService } from '@ghostfolio/api/services/i18n/i18n.service';
import { PortfolioPosition, UserSettings } from '@ghostfolio/common/interfaces';

export class CurrencyClusterRiskCurrentInvestment extends Rule<Settings> {
  private holdings: PortfolioPosition[];

  public constructor(
    protected exchangeRateDataService: ExchangeRateDataService,
    private i18nService: I18nService,
    holdings: PortfolioPosition[],
    languageCode: string
  ) {
    super(exchangeRateDataService, {
      key: CurrencyClusterRiskCurrentInvestment.name,
      languageCode
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
        evaluation: this.i18nService.getTranslation({
          id: 'rule.currencyClusterRiskCurrentInvestment.false',
          languageCode: this.getLanguageCode(),
          placeholders: {
            currency: maxItem.groupKey as string,
            maxValueRatio: (maxValueRatio * 100).toPrecision(3),
            thresholdMax: ruleSettings.thresholdMax * 100
          }
        }),
        value: false
      };
    }

    return {
      evaluation: this.i18nService.getTranslation({
        id: 'rule.currencyClusterRiskCurrentInvestment.true',
        languageCode: this.getLanguageCode(),
        placeholders: {
          currency: maxItem.groupKey as string,
          maxValueRatio: (maxValueRatio * 100).toPrecision(3),
          thresholdMax: ruleSettings.thresholdMax * 100
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
      thresholdMax: true
    };
  }

  public getName() {
    return this.i18nService.getTranslation({
      id: 'rule.currencyClusterRiskCurrentInvestment',
      languageCode: this.getLanguageCode()
    });
  }

  public getCategoryName() {
    return this.i18nService.getTranslation({
      id: 'rule.currencyClusterRisk.category',
      languageCode: this.getLanguageCode()
    });
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
