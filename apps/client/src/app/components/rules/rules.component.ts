import { UpdateUserSettingDto } from '@ghostfolio/api/app/user/update-user-setting.dto';
import { PortfolioReportRule } from '@ghostfolio/common/interfaces';

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
  @Input() hasPermissionToCreateOrder: boolean;
  @Input() rules: PortfolioReportRule[];
  @Output() rulesUpdated = new EventEmitter<UpdateUserSettingDto>();

  public constructor() {}

  public onRulesUpdated(event: UpdateUserSettingDto) {
    this.rulesUpdated.emit(event);
  }
}
