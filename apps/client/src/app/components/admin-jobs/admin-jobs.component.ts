import { NotificationService } from '@ghostfolio/client/core/notification/notification.service';
import { AdminService } from '@ghostfolio/client/services/admin.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import {
  DATA_GATHERING_QUEUE_PRIORITY_HIGH,
  DATA_GATHERING_QUEUE_PRIORITY_LOW,
  DATA_GATHERING_QUEUE_PRIORITY_MEDIUM,
  QUEUE_JOB_STATUS_LIST
} from '@ghostfolio/common/config';
import { getDateWithTimeFormatString } from '@ghostfolio/common/helper';
import { AdminJobs, User } from '@ghostfolio/common/interfaces';

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { JobStatus } from 'bull';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'gf-admin-jobs',
  styleUrls: ['./admin-jobs.scss'],
  templateUrl: './admin-jobs.html'
})
export class AdminJobsComponent implements OnDestroy, OnInit {
  public DATA_GATHERING_QUEUE_PRIORITY_LOW = DATA_GATHERING_QUEUE_PRIORITY_LOW;
  public DATA_GATHERING_QUEUE_PRIORITY_HIGH =
    DATA_GATHERING_QUEUE_PRIORITY_HIGH;
  public DATA_GATHERING_QUEUE_PRIORITY_MEDIUM =
    DATA_GATHERING_QUEUE_PRIORITY_MEDIUM;
  public defaultDateTimeFormat: string;
  public filterForm: FormGroup;
  public dataSource: MatTableDataSource<AdminJobs['jobs'][0]> =
    new MatTableDataSource();
  public displayedColumns = [
    'index',
    'type',
    'symbol',
    'dataSource',
    'priority',
    'attempts',
    'created',
    'finished',
    'status',
    'actions'
  ];
  public statusFilterOptions = QUEUE_JOB_STATUS_LIST;
  public user: User;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private adminService: AdminService,
    private changeDetectorRef: ChangeDetectorRef,
    private formBuilder: FormBuilder,
    private notificationService: NotificationService,
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

  public ngOnInit() {
    this.filterForm = this.formBuilder.group({
      status: []
    });

    this.filterForm.valueChanges
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(() => {
        const currentFilter = this.filterForm.get('status').value;
        this.fetchJobs(currentFilter ? [currentFilter] : undefined);
      });

    this.fetchJobs();
  }

  public onDeleteJob(aId: string) {
    this.adminService
      .deleteJob(aId)
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(() => {
        this.fetchJobs();
      });
  }

  public onDeleteJobs() {
    const currentFilter = this.filterForm.get('status').value;

    this.adminService
      .deleteJobs({ status: currentFilter ? [currentFilter] : undefined })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(() => {
        this.fetchJobs(currentFilter ? [currentFilter] : undefined);
      });
  }

  public onExecuteJob(aId: string) {
    this.adminService
      .executeJob(aId)
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(() => {
        this.fetchJobs();
      });
  }

  public onViewData(aData: AdminJobs['jobs'][0]['data']) {
    this.notificationService.alert({
      title: JSON.stringify(aData, null, '  ')
    });
  }

  public onViewStacktrace(aStacktrace: AdminJobs['jobs'][0]['stacktrace']) {
    this.notificationService.alert({
      title: JSON.stringify(aStacktrace, null, '  ')
    });
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  private fetchJobs(aStatus?: JobStatus[]) {
    this.adminService
      .fetchJobs({ status: aStatus })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(({ jobs }) => {
        this.dataSource = new MatTableDataSource(jobs);

        this.changeDetectorRef.markForCheck();
      });
  }
}
