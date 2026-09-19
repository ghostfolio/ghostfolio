import { Rule } from '@ghostfolio/api/models/rule';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { I18nService } from '@ghostfolio/api/services/i18n/i18n.service';
import { PortfolioPosition, RuleSettings } from '@ghostfolio/common/interfaces';

export class CurrencyClusterRiskBaseCurrencyCurrentInvestment extends Rule<Settings> {
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
    super({
      exchangeRateDataService,
      languageCode,
      key: 'CurrencyClusterRiskBaseCurrencyCurrentInvestment'
    });

    this.holdings = holdings;
    this.i18nService = i18nService;
  }

  public evaluate(ruleSettings: Settings) {
    const holdingsGroupedByCurrency = this.groupCurrentHoldingsByAttribute(
      this.holdings,
      'assetProfile.currency',
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
            baseCurrency: ruleSettings.baseCurrency,
            baseCurrencyValueRatio: (baseCurrencyValueRatio * 100).toPrecision(
              3
            )
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
          baseCurrency: ruleSettings.baseCurrency,
          baseCurrencyValueRatio: (baseCurrencyValueRatio * 100).toPrecision(3)
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
}

interface Settings extends RuleSettings {
  baseCurrency: string;
}
