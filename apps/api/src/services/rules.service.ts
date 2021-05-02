import { Injectable } from '@nestjs/common';

import { Portfolio } from '../models/portfolio';
import { Rule } from '../models/rule';
import { AccountClusterRiskCurrentInvestment } from '../models/rules/account-cluster-risk/current-investment';
import { AccountClusterRiskInitialInvestment } from '../models/rules/account-cluster-risk/initial-investment';
import { AccountClusterRiskSingleAccount } from '../models/rules/account-cluster-risk/single-account';
import { CurrencyClusterRiskBaseCurrencyCurrentInvestment } from '../models/rules/currency-cluster-risk/base-currency-current-investment';
import { CurrencyClusterRiskBaseCurrencyInitialInvestment } from '../models/rules/currency-cluster-risk/base-currency-initial-investment';
import { CurrencyClusterRiskCurrentInvestment } from '../models/rules/currency-cluster-risk/current-investment';
import { CurrencyClusterRiskInitialInvestment } from '../models/rules/currency-cluster-risk/initial-investment';
import { FeeRatioInitialInvestment } from '../models/rules/fees/fee-ratio-initial-investment';

@Injectable()
export class RulesService {
  public constructor() {}

  public async evaluate(
    aPortfolio: Portfolio,
    aRules: Rule[],
    aUserSettings: { baseCurrency: string }
  ) {
    const defaultSettings = this.getDefaultRuleSettings(aUserSettings);
    const details = await aPortfolio.getDetails();

    return aRules
      .filter((rule) => {
        return defaultSettings[rule.constructor.name]?.isActive;
      })
      .map((rule) => {
        const evaluationResult = rule.evaluate(
          details,
          aPortfolio.getFees(),
          defaultSettings
        );
        return { ...evaluationResult, name: rule.getName() };
      });
  }

  private getDefaultRuleSettings(aUserSettings: { baseCurrency: string }) {
    return {
      [AccountClusterRiskCurrentInvestment.name]: {
        baseCurrency: aUserSettings.baseCurrency,
        isActive: true,
        threshold: 0.5
      },
      [AccountClusterRiskInitialInvestment.name]: {
        baseCurrency: aUserSettings.baseCurrency,
        isActive: true,
        threshold: 0.5
      },
      [AccountClusterRiskSingleAccount.name]: { isActive: true },
      [CurrencyClusterRiskBaseCurrencyInitialInvestment.name]: {
        baseCurrency: aUserSettings.baseCurrency,
        isActive: true
      },
      [CurrencyClusterRiskBaseCurrencyCurrentInvestment.name]: {
        baseCurrency: aUserSettings.baseCurrency,
        isActive: true
      },
      [CurrencyClusterRiskCurrentInvestment.name]: {
        baseCurrency: aUserSettings.baseCurrency,
        isActive: true,
        threshold: 0.5
      },
      [CurrencyClusterRiskInitialInvestment.name]: {
        baseCurrency: aUserSettings.baseCurrency,
        isActive: true,
        threshold: 0.5
      },
      [FeeRatioInitialInvestment.name]: {
        baseCurrency: aUserSettings.baseCurrency,
        isActive: true,
        threshold: 0.01
      }
    };
  }
}
