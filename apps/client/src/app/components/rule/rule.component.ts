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
import { MatDialog } from '@angular/material/dialog';
import { isEmpty } from 'lodash';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Subject, takeUntil } from 'rxjs';

import { IRuleSettingsDialogParams } from './rule-settings-dialog/interfaces/interfaces';
import { GfRuleSettingsDialogComponent } from './rule-settings-dialog/rule-settings-dialog.component';

@Component({
  selector: 'gf-rule',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './rule.component.html',
  styleUrls: ['./rule.component.scss']
})
export class RuleComponent implements OnInit {
  @Input() hasPermissionToUpdateUserSettings: boolean;
  @Input() isLoading: boolean;
  @Input() rule: PortfolioReportRule;

  @Output() ruleUpdated = new EventEmitter<UpdateUserSettingDto>();

  public isEmpty = isEmpty;

  private deviceType: string;
  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private deviceService: DeviceDetectorService,
    private dialog: MatDialog
  ) {}

  public ngOnInit() {
    this.deviceType = this.deviceService.getDeviceInfo().deviceType;
  }

  public onCustomizeRule(rule: PortfolioReportRule) {
    const dialogRef = this.dialog.open(GfRuleSettingsDialogComponent, {
      data: <IRuleSettingsDialogParams>{
        rule
      },
      width: this.deviceType === 'mobile' ? '100vw' : '50rem'
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(
        ({ settings }: { settings: PortfolioReportRule['settings'] }) => {
          if (settings) {
            console.log(settings);

            // TODO
            // this.ruleUpdated.emit(settings);
          }
        }
      );
  }

  public onUpdateRule(rule: PortfolioReportRule) {
    const settings: UpdateUserSettingDto = {
      xRayRules: {
        [rule.key]: { isActive: !rule.isActive }
      }
    };

    this.ruleUpdated.emit(settings);
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
