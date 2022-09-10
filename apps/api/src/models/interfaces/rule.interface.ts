import { RuleSettings } from '@ghostfolio/api/models/interfaces/rule-settings.interface';
import { UserSettings } from '@ghostfolio/common/interfaces';

import { EvaluationResult } from './evaluation-result.interface';

export interface RuleInterface<T extends RuleSettings> {
  evaluate(aRuleSettings: T): EvaluationResult;

  getSettings(aUserSettings: UserSettings): T;
}
