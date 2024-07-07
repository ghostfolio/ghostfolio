import { RuleSettings } from '@ghostfolio/api/models/interfaces/rule-settings.interface';
import { Rule } from '@ghostfolio/api/models/rule';
import { UserSettings } from '@ghostfolio/common/interfaces';

import { Injectable } from '@nestjs/common';

@Injectable()
export class RulesService {
  public constructor() {}

  public async evaluate<T extends RuleSettings>(
    aRules: Rule<T>[],
    aUserSettings: UserSettings
  ) {
    return aRules.map((rule) => {
      if (rule.getSettings(aUserSettings)?.isActive) {
        const { evaluation, value } = rule.evaluate(
          rule.getSettings(aUserSettings)
        );

        return {
          evaluation,
          isActive: true,
          key: rule.getKey(),
          name: rule.getName(),
          value
        };
      } else {
        return {
          isActive: false,
          key: rule.getKey(),
          name: rule.getName()
        };
      }
    });
  }
}
