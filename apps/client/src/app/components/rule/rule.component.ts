import { UpdateUserSettingDto } from '@ghostfolio/api/app/user/update-user-setting.dto';
import { PortfolioReportRule } from '@ghostfolio/common/interfaces';

import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output
} from '@angular/core';

@Component({
  selector: 'gf-rule',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './rule.component.html',
  styleUrls: ['./rule.component.scss']
})
export class RuleComponent implements OnInit {
  @Input() isLoading: boolean;
  @Input() rule: PortfolioReportRule;

  @Output() ruleUpdated = new EventEmitter<UpdateUserSettingDto>();

  public constructor() {}

  public ngOnInit() {}

  public onUpdateRule(rule: PortfolioReportRule) {
    let settings: UpdateUserSettingDto = {
      xRayRules: {
        [rule.key]: { isActive: !rule.isActive }
      }
    };
    this.ruleUpdated.emit(settings);
  }
}
