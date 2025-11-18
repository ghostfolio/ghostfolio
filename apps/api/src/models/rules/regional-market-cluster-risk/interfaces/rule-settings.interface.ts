import { RuleSettings } from '@ghostfolio/common/interfaces';

export interface Settings extends RuleSettings {
  baseCurrency: string;
  thresholdMin: number;
  thresholdMax: number;
}
