import { UpdateUserSettingDto } from '@ghostfolio/api/app/user/update-user-setting.dto';
import { PortfolioReportRule } from '@ghostfolio/common/interfaces';
import { XRayRulesSettings } from '@ghostfolio/common/types';

import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output
} from '@angular/core';

@Component({
  selector: 'gf-rules',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './rules.component.html',
  styleUrls: ['./rules.component.scss']
})
export class RulesComponent {
  @Input() hasPermissionToUpdateUserSettings: boolean;
  @Input() isLoading: boolean;
  @Input() rules: PortfolioReportRule[];
  @Input() settings: XRayRulesSettings;

  @Output() rulesUpdated = new EventEmitter<UpdateUserSettingDto>();

  public onRuleUpdated(event: UpdateUserSettingDto) {
    this.rulesUpdated.emit(event);
  }
}
