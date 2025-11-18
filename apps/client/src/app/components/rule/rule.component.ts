import { UpdateUserSettingDto } from '@ghostfolio/common/dtos';
import {
  PortfolioReportRule,
  RuleSettings,
  XRayRulesSettings
} from '@ghostfolio/common/interfaces';

import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addCircleOutline,
  checkmarkCircleOutline,
  ellipsisHorizontal,
  optionsOutline,
  removeCircleOutline,
  warningOutline
} from 'ionicons/icons';
import { DeviceDetectorService } from 'ngx-device-detector';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { Subject, takeUntil } from 'rxjs';

import { RuleSettingsDialogParams } from './rule-settings-dialog/interfaces/interfaces';
import { GfRuleSettingsDialogComponent } from './rule-settings-dialog/rule-settings-dialog.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    IonIcon,
    MatButtonModule,
    MatMenuModule,
    NgxSkeletonLoaderModule
  ],
  selector: 'gf-rule',
  styleUrls: ['./rule.component.scss'],
  templateUrl: './rule.component.html'
})
export class GfRuleComponent implements OnInit {
  @Input() categoryName: string;
  @Input() hasPermissionToUpdateUserSettings: boolean;
  @Input() isLoading: boolean;
  @Input() locale: string;
  @Input() rule: PortfolioReportRule;
  @Input() settings: XRayRulesSettings['AccountClusterRiskCurrentInvestment'];

  @Output() ruleUpdated = new EventEmitter<UpdateUserSettingDto>();

  private deviceType: string;
  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private deviceService: DeviceDetectorService,
    private dialog: MatDialog
  ) {
    addIcons({
      addCircleOutline,
      checkmarkCircleOutline,
      ellipsisHorizontal,
      optionsOutline,
      removeCircleOutline,
      warningOutline
    });
  }

  public ngOnInit() {
    this.deviceType = this.deviceService.getDeviceInfo().deviceType;
  }

  public onCustomizeRule(rule: PortfolioReportRule) {
    const dialogRef = this.dialog.open<
      GfRuleSettingsDialogComponent,
      RuleSettingsDialogParams
    >(GfRuleSettingsDialogComponent, {
      data: {
        rule,
        categoryName: this.categoryName,
        locale: this.locale,
        settings: this.settings
      },
      width: this.deviceType === 'mobile' ? '100vw' : '50rem'
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((settings: RuleSettings) => {
        if (settings) {
          this.ruleUpdated.emit({
            xRayRules: {
              [rule.key]: settings
            }
          });
        }
      });
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
