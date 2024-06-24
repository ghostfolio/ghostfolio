import { UpdateUserSettingDto } from '@ghostfolio/api/app/user/update-user-setting.dto';
import { DataService } from '@ghostfolio/client/services/data.service';
import { PortfolioReportRule } from '@ghostfolio/common/interfaces';

import {
  ChangeDetectorRef,
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
} from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'gf-rule',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './rule.component.html',
  styleUrls: ['./rule.component.scss']
})
export class RuleComponent implements OnInit {
  @Input() isLoading: boolean;
  @Input() rule: PortfolioReportRule;
  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService
  ) {}

  public ngOnInit() {}

  public onUpdateAccount(rule: PortfolioReportRule) {
    let settings: UpdateUserSettingDto = {
      xRayRules: {
        [rule.key]: { isActive: !('evaluation' in rule) }
      }
    };
    this.dataService
      .putUserSetting(settings)
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(() => {
        this.dataService
          .fetchPortfolioReport()
          .pipe(takeUntil(this.unsubscribeSubject))
          .subscribe((report) => {
            for (const ruleGroup in report.rules) {
              for (const singleRule in report.rules[ruleGroup]) {
                if (report.rules[ruleGroup][singleRule]['key'] === rule.key) {
                  this.rule = report.rules[ruleGroup][singleRule];
                  break;
                }
              }
            }
            this.changeDetectorRef.markForCheck();
          });
      });
  }
}
