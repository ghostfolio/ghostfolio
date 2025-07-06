import { RuleSettings } from '@ghostfolio/api/models/interfaces/rule-settings.interface';
import { Rule } from '@ghostfolio/api/models/rule';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { I18nService } from '@ghostfolio/api/services/i18n/i18n.service';
import { PortfolioDetails, UserSettings } from '@ghostfolio/common/interfaces';

import { Account } from '@prisma/client';

export class AccountClusterRiskCurrentInvestment extends Rule<Settings> {
  private accounts: PortfolioDetails['accounts'];

  public constructor(
    protected exchangeRateDataService: ExchangeRateDataService,
    private i18nService: I18nService,
    languageCode: string,
    accounts: PortfolioDetails['accounts']
  ) {
    super(exchangeRateDataService, {
      languageCode,
      key: AccountClusterRiskCurrentInvestment.name
    });

    this.accounts = accounts;
  }

  public evaluate(ruleSettings: Settings) {
    const accounts: {
      [symbol: string]: Pick<Account, 'name'> & {
        investment: number;
      };
    } = {};

    for (const [accountId, account] of Object.entries(this.accounts)) {
      accounts[accountId] = {
        investment: account.valueInBaseCurrency,
        name: account.name
      };
    }

    let maxAccount: (typeof accounts)[0];
    let totalInvestment = 0;

    for (const account of Object.values(accounts)) {
      if (!maxAccount) {
        maxAccount = account;
      }

      // Calculate total investment
      totalInvestment += account.investment;

      // Find maximum
      if (account.investment > maxAccount?.investment) {
        maxAccount = account;
      }
    }

    const maxInvestmentRatio = maxAccount?.investment / totalInvestment || 0;

    if (maxInvestmentRatio > ruleSettings.thresholdMax) {
      return {
        evaluation: this.i18nService.getTranslation({
          id: 'rule.accountClusterRiskCurrentInvestment.false',
          languageCode: this.getLanguageCode(),
          placeholders: {
            maxAccountName: maxAccount.name,
            maxInvestmentRatio: (maxInvestmentRatio * 100).toPrecision(3),
            thresholdMax: ruleSettings.thresholdMax * 100
          }
        }),
        value: false
      };
    }

    return {
      evaluation: this.i18nService.getTranslation({
        id: 'rule.accountClusterRiskCurrentInvestment.true',
        languageCode: this.getLanguageCode(),
        placeholders: {
          maxAccountName: maxAccount.name,
          maxInvestmentRatio: (maxInvestmentRatio * 100).toPrecision(3),
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
      id: 'rule.accountClusterRiskCurrentInvestment',
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
