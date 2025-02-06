import { RuleSettings } from '@ghostfolio/api/models/interfaces/rule-settings.interface';

export interface Settings extends RuleSettings {
  baseCurrency: string;
  thresholdMin: number;
  thresholdMax: number;
}
