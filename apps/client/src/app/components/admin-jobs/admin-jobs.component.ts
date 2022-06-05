import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';
import { AdminService } from '@ghostfolio/client/services/admin.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { getDateWithTimeFormatString } from '@ghostfolio/common/helper';
import { AdminJobs, User } from '@ghostfolio/common/interfaces';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'gf-admin-jobs',
  styleUrls: ['./admin-jobs.scss'],
  templateUrl: './admin-jobs.html'
})
export class AdminJobsComponent implements OnDestroy, OnInit {
  public defaultDateTimeFormat: string;
  public jobs: AdminJobs['jobs'] = [];
  public user: User;

  private unsubscribeSubject = new Subject<void>();

  /**
   * @constructor
   */
  public constructor(
    private adminService: AdminService,
    private changeDetectorRef: ChangeDetectorRef,
    private userService: UserService
  ) {
    this.userService.stateChanged
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((state) => {
        if (state?.user) {
          this.user = state.user;

          this.defaultDateTimeFormat = getDateWithTimeFormatString(
            this.user.settings.locale
          );
        }
      });
  }

  /**
   * Initializes the controller
   */
  public ngOnInit() {
    this.fetchJobs();
  }

  public onViewStacktrace(aStacktrace: AdminJobs['jobs'][0]['stacktrace']) {
    alert(JSON.stringify(aStacktrace, null, '  '));
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  private fetchJobs() {
    this.adminService
      .fetchJobs()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(({ jobs }) => {
        this.jobs = jobs;

        this.changeDetectorRef.markForCheck();
      });
  }
}
