import { Rule } from '@ghostfolio/api/models/rule';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { I18nService } from '@ghostfolio/api/services/i18n/i18n.service';
import { DEFAULT_CURRENCY, DEFAULT_LOCALE } from '@ghostfolio/common/config';
import { RuleSettings, UserSettings } from '@ghostfolio/common/interfaces';

import { Big } from 'big.js';

export class EmergencyFundCoverage extends Rule<Settings> {
  public constructor(
    exchangeRateDataService: ExchangeRateDataService,
    private i18nService: I18nService,
    languageCode: string,
    private emergencyFundInBaseCurrency: number,
    private emergencyFundHoldingsValueInBaseCurrency: number,
    private cashBalanceInBaseCurrency: number
  ) {
    super(exchangeRateDataService, {
      languageCode,
      key: EmergencyFundCoverage.name
    });
  }

  public evaluate(ruleSettings: Settings) {
    if (!this.emergencyFundInBaseCurrency) {
      return {
        evaluation: this.i18nService.getTranslation({
          id: 'rule.emergencyFundCoverage.false.unset',
          languageCode: this.getLanguageCode()
        }),
        value: false
      };
    }

    const placeholders = {
      baseCurrency: ruleSettings.baseCurrency,
      emergencyFund: this.emergencyFundInBaseCurrency.toLocaleString(
        ruleSettings.locale
      )
    };

    // Only the holdings tagged as emergency fund are an explicit commitment,
    // the cash balance covers the remainder
    if (
      new Big(this.emergencyFundHoldingsValueInBaseCurrency).gt(
        this.emergencyFundInBaseCurrency
      )
    ) {
      return {
        evaluation: this.i18nService.getTranslation({
          placeholders,
          id: 'rule.emergencyFundCoverage.false.over',
          languageCode: this.getLanguageCode()
        }),
        value: false
      };
    }

    const coverageInBaseCurrency = new Big(
      this.emergencyFundHoldingsValueInBaseCurrency
    ).plus(this.cashBalanceInBaseCurrency);

    if (coverageInBaseCurrency.lt(this.emergencyFundInBaseCurrency)) {
      return {
        evaluation: this.i18nService.getTranslation({
          placeholders,
          id: 'rule.emergencyFundCoverage.false.under',
          languageCode: this.getLanguageCode()
        }),
        value: false
      };
    }

    return {
      evaluation: this.i18nService.getTranslation({
        placeholders,
        id: 'rule.emergencyFundCoverage.true',
        languageCode: this.getLanguageCode()
      }),
      value: true
    };
  }

  public getConfiguration() {
    return undefined;
  }

  public getName() {
    return this.i18nService.getTranslation({
      id: 'rule.emergencyFundCoverage',
      languageCode: this.getLanguageCode()
    });
  }

  public getSettings({
    baseCurrency = DEFAULT_CURRENCY,
    locale = DEFAULT_LOCALE,
    xRayRules
  }: UserSettings): Settings {
    return {
      baseCurrency,
      locale,
      isActive: xRayRules?.[this.getKey()]?.isActive ?? true
    };
  }
}

interface Settings extends RuleSettings {
  baseCurrency: string;
}
