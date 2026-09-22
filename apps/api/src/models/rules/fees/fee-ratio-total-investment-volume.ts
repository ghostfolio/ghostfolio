import { Rule } from '@ghostfolio/api/models/rule';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { I18nService } from '@ghostfolio/api/services/i18n/i18n.service';
import { RuleSettings } from '@ghostfolio/common/interfaces';

export class FeeRatioTotalInvestmentVolume extends Rule<Settings> {
  private fees: number;
  private i18nService: I18nService;
  private totalInvestmentVolumeInBaseCurrency: number;

  public constructor({
    exchangeRateDataService,
    fees,
    i18nService,
    languageCode,
    totalInvestmentVolumeInBaseCurrency
  }: {
    exchangeRateDataService: ExchangeRateDataService;
    fees: number;
    i18nService: I18nService;
    languageCode: string;
    totalInvestmentVolumeInBaseCurrency: number;
  }) {
    super({
      exchangeRateDataService,
      languageCode,
      key: 'FeeRatioTotalInvestmentVolume'
    });

    this.fees = fees;
    this.i18nService = i18nService;
    this.totalInvestmentVolumeInBaseCurrency =
      totalInvestmentVolumeInBaseCurrency;
  }

  public evaluate(ruleSettings: Settings) {
    const feeRatio = this.totalInvestmentVolumeInBaseCurrency
      ? this.fees / this.totalInvestmentVolumeInBaseCurrency
      : 0;

    if (feeRatio > ruleSettings.thresholdMax) {
      return {
        evaluation: this.i18nService.getTranslation({
          id: 'rule.feeRatioTotalInvestmentVolume.false',
          languageCode: this.getLanguageCode(),
          placeholders: {
            feeRatio: (ruleSettings.thresholdMax * 100).toFixed(2),
            thresholdMax: (feeRatio * 100).toPrecision(3)
          }
        }),
        value: false
      };
    }

    return {
      evaluation: this.i18nService.getTranslation({
        id: 'rule.feeRatioTotalInvestmentVolume.true',
        languageCode: this.getLanguageCode(),
        placeholders: {
          feeRatio: (feeRatio * 100).toPrecision(3),
          thresholdMax: (ruleSettings.thresholdMax * 100).toFixed(2)
        }
      }),
      value: true
    };
  }

  public getConfiguration() {
    return {
      threshold: {
        max: 0.1,
        min: 0,
        step: 0.0025,
        unit: '%'
      },
      thresholdMax: true
    };
  }

  public getName() {
    return this.i18nService.getTranslation({
      id: 'rule.feeRatioTotalInvestmentVolume',
      languageCode: this.getLanguageCode()
    });
  }
}

interface Settings extends RuleSettings {
  baseCurrency: string;
  thresholdMax: number;
}
