import { Rule } from '@ghostfolio/api/models/rule';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { I18nService } from '@ghostfolio/api/services/i18n/i18n.service';
import { PortfolioDetails, RuleSettings } from '@ghostfolio/common/interfaces';

import { Account } from '@prisma/client';

export class AccountClusterRiskCurrentInvestment extends Rule<Settings> {
  private accounts: PortfolioDetails['accounts'];
  private i18nService: I18nService;

  public constructor({
    accounts,
    exchangeRateDataService,
    i18nService,
    languageCode
  }: {
    accounts: PortfolioDetails['accounts'];
    exchangeRateDataService: ExchangeRateDataService;
    i18nService: I18nService;
    languageCode: string;
  }) {
    super(exchangeRateDataService, {
      languageCode,
      key: 'AccountClusterRiskCurrentInvestment'
    });

    this.accounts = accounts;
    this.i18nService = i18nService;
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

    if (Object.keys(accounts).length === 0) {
      return {
        evaluation: this.i18nService.getTranslation({
          id: 'rule.accountClusterRiskCurrentInvestment.false.invalid',
          languageCode: this.getLanguageCode()
        }),
        value: false
      };
    }

    let maxAccount: (typeof accounts)[0] | undefined;
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

    const maxInvestmentRatio =
      (maxAccount?.investment ?? 0) / totalInvestment || 0;

    if (maxInvestmentRatio > ruleSettings.thresholdMax) {
      return {
        evaluation: this.i18nService.getTranslation({
          id: 'rule.accountClusterRiskCurrentInvestment.false',
          languageCode: this.getLanguageCode(),
          placeholders: {
            maxAccountName: maxAccount?.name ?? '',
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
          maxAccountName: maxAccount?.name ?? '',
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
}

interface Settings extends RuleSettings {
  baseCurrency: string;
  thresholdMax: number;
}
