import { Rule } from '@ghostfolio/api/models/rule';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { I18nService } from '@ghostfolio/api/services/i18n/i18n.service';
import { DEFAULT_CURRENCY, DEFAULT_LOCALE } from '@ghostfolio/common/config';
import { RuleSettings, UserSettings } from '@ghostfolio/common/interfaces';

export class EmergencyFundCoverage extends Rule<Settings> {
  private cashBalanceInBaseCurrency: number;
  private emergencyFundHoldingsValueInBaseCurrency: number;
  private emergencyFundInBaseCurrency: number;

  public constructor(
    exchangeRateDataService: ExchangeRateDataService,
    private i18nService: I18nService,
    languageCode: string,
    emergencyFundInBaseCurrency: number,
    emergencyFundHoldingsValueInBaseCurrency: number,
    cashBalanceInBaseCurrency: number
  ) {
    super(exchangeRateDataService, {
      languageCode,
      key: EmergencyFundCoverage.name
    });

    this.cashBalanceInBaseCurrency = cashBalanceInBaseCurrency;
    this.emergencyFundHoldingsValueInBaseCurrency =
      emergencyFundHoldingsValueInBaseCurrency;
    this.emergencyFundInBaseCurrency = emergencyFundInBaseCurrency;
  }

  public evaluate(ruleSettings: Settings) {
    // Only the holdings tagged as emergency fund are an explicit commitment,
    // the cash balance covers the remainder
    if (
      this.emergencyFundHoldingsValueInBaseCurrency >
      this.emergencyFundInBaseCurrency
    ) {
      return {
        evaluation: this.i18nService.getTranslation({
          id: 'rule.emergencyFundCoverage.false.over',
          languageCode: this.getLanguageCode(),
          placeholders: {
            baseCurrency: ruleSettings.baseCurrency,
            emergencyFund: this.emergencyFundInBaseCurrency.toLocaleString(
              ruleSettings.locale
            ),
            emergencyFundHoldingsValue:
              this.emergencyFundHoldingsValueInBaseCurrency.toLocaleString(
                ruleSettings.locale
              )
          }
        }),
        value: false
      };
    }

    const coverageInBaseCurrency =
      this.emergencyFundHoldingsValueInBaseCurrency +
      this.cashBalanceInBaseCurrency;

    if (coverageInBaseCurrency < this.emergencyFundInBaseCurrency) {
      return {
        evaluation: this.i18nService.getTranslation({
          id: 'rule.emergencyFundCoverage.false.under',
          languageCode: this.getLanguageCode(),
          placeholders: {
            baseCurrency: ruleSettings.baseCurrency,
            coverage: coverageInBaseCurrency.toLocaleString(
              ruleSettings.locale
            ),
            emergencyFund: this.emergencyFundInBaseCurrency.toLocaleString(
              ruleSettings.locale
            )
          }
        }),
        value: false
      };
    }

    return {
      evaluation: this.i18nService.getTranslation({
        id: 'rule.emergencyFundCoverage.true',
        languageCode: this.getLanguageCode(),
        placeholders: {
          baseCurrency: ruleSettings.baseCurrency,
          emergencyFund: this.emergencyFundInBaseCurrency.toLocaleString(
            ruleSettings.locale
          )
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
