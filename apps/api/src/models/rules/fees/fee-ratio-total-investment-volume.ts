import { Rule } from '@ghostfolio/api/models/rule';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { I18nService } from '@ghostfolio/api/services/i18n/i18n.service';
import { RuleSettings, UserSettings } from '@ghostfolio/common/interfaces';

export class FeeRatioTotalInvestmentVolume extends Rule<Settings> {
  private fees: number;
  private totalInvestmentVolumeInBaseCurrency: number;

  public constructor(
    protected exchangeRateDataService: ExchangeRateDataService,
    private i18nService: I18nService,
    languageCode: string,
    totalInvestmentVolumeInBaseCurrency: number,
    fees: number
  ) {
    super(exchangeRateDataService, {
      languageCode,
      key: FeeRatioTotalInvestmentVolume.name
    });

    this.fees = fees;
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

  public getCategoryName() {
    return this.i18nService.getTranslation({
      id: 'rule.fees.category',
      languageCode: this.getLanguageCode()
    });
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

  public getSettings({
    baseCurrency,
    locale,
    xRayRules
  }: UserSettings): Settings {
    return {
      baseCurrency,
      locale,
      isActive: xRayRules?.[this.getKey()]?.isActive ?? true,
      thresholdMax: xRayRules?.[this.getKey()]?.thresholdMax ?? 0.01
    };
  }
}

interface Settings extends RuleSettings {
  baseCurrency: string;
  thresholdMax: number;
}
