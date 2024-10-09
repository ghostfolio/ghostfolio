import { RuleSettings } from '@ghostfolio/api/models/interfaces/rule-settings.interface';
import { Rule } from '@ghostfolio/api/models/rule';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { PortfolioPosition, UserSettings } from '@ghostfolio/common/interfaces';

export class CurrencyClusterRiskBaseCurrencyCurrentInvestment extends Rule<Settings> {
  private holdings: PortfolioPosition[];

  public constructor(
    protected exchangeRateDataService: ExchangeRateDataService,
    holdings: PortfolioPosition[]
  ) {
    super(exchangeRateDataService, {
      key: CurrencyClusterRiskBaseCurrencyCurrentInvestment.name,
      name: 'Investment: Base Currency'
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
      if (groupItem.investment > maxItem.investment) {
        maxItem = groupItem;
      }
    });

    const baseCurrencyItem = holdingsGroupedByCurrency.find((item) => {
      return item.groupKey === ruleSettings.baseCurrency;
    });

    const baseCurrencyValueRatio = baseCurrencyItem?.value / totalValue || 0;

    if (maxItem?.groupKey !== ruleSettings.baseCurrency) {
      return {
        evaluation: `The major part of your current investment is not in your base currency (${(
          baseCurrencyValueRatio * 100
        ).toPrecision(3)}% in ${ruleSettings.baseCurrency})`,
        value: false
      };
    }

    return {
      evaluation: `The major part of your current investment is in your base currency (${(
        baseCurrencyValueRatio * 100
      ).toPrecision(3)}% in ${ruleSettings.baseCurrency})`,
      value: true
    };
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
