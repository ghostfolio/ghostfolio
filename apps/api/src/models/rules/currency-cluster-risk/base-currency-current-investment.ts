import { RuleSettings } from '@ghostfolio/api/models/interfaces/rule-settings.interface';
import { Rule } from '@ghostfolio/api/models/rule';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { I18nService } from '@ghostfolio/api/services/i18n/i18n.service';
import { PortfolioPosition, UserSettings } from '@ghostfolio/common/interfaces';

export class CurrencyClusterRiskBaseCurrencyCurrentInvestment extends Rule<Settings> {
  private holdings: PortfolioPosition[];

  public constructor(
    protected exchangeRateDataService: ExchangeRateDataService,
    private i18nService: I18nService,
    holdings: PortfolioPosition[],
    languageCode: string
  ) {
    super(exchangeRateDataService, {
      key: CurrencyClusterRiskBaseCurrencyCurrentInvestment.name,
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

    const baseCurrencyValue =
      holdingsGroupedByCurrency.find(({ groupKey }) => {
        return groupKey === ruleSettings.baseCurrency;
      })?.value ?? 0;

    for (const groupItem of holdingsGroupedByCurrency) {
      // Calculate total value
      totalValue += groupItem.value;

      // Find maximum
      if (groupItem.investment > maxItem.investment) {
        maxItem = groupItem;
      }
    }

    const baseCurrencyValueRatio = totalValue
      ? baseCurrencyValue / totalValue
      : 0;

    if (maxItem?.groupKey !== ruleSettings.baseCurrency) {
      return {
        evaluation: this.i18nService.getTranslation({
          id: 'rule.currencyClusterRiskBaseCurrencyCurrentInvestment.false',
          languageCode: this.getLanguageCode(),
          placeholders: {
            baseCurrencyValueRatio: (baseCurrencyValueRatio * 100).toPrecision(
              3
            ),
            baseCurrency: ruleSettings.baseCurrency
          }
        }),
        value: false
      };
    }

    return {
      evaluation: this.i18nService.getTranslation({
        id: 'rule.currencyClusterRiskBaseCurrencyCurrentInvestment.true',
        languageCode: this.getLanguageCode(),
        placeholders: {
          baseCurrencyValueRatio: (baseCurrencyValueRatio * 100).toPrecision(3),
          baseCurrency: ruleSettings.baseCurrency
        }
      }),
      value: true
    };
  }

  public getConfiguration() {
    return undefined;
  }

  public getName() {
    return this.i18nService.getTranslation({
      id: 'rule.currencyClusterRiskBaseCurrencyCurrentInvestment',
      languageCode: this.getLanguageCode()
    });
  }

  public getSettings({ baseCurrency, xRayRules }: UserSettings): Settings {
    return {
      baseCurrency,
      isActive: xRayRules?.[this.getKey()].isActive ?? true
    };
  }
}

interface Settings extends RuleSettings {
  baseCurrency: string;
}
