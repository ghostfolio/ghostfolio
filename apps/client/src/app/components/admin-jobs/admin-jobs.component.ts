import { AdminService } from '@ghostfolio/client/services/admin.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { QUEUE_JOB_STATUS_LIST } from '@ghostfolio/common/config';
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
  public defaultDateTimeFormat: string;
  public filterForm: FormGroup;
  public dataSource: MatTableDataSource<AdminJobs['jobs'][0]> =
    new MatTableDataSource();
  public displayedColumns = [
    'index',
    'type',
    'symbol',
    'dataSource',
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

  public onViewData(aData: AdminJobs['jobs'][0]['data']) {
    alert(JSON.stringify(aData, null, '  '));
  }

  public onViewStacktrace(aStacktrace: AdminJobs['jobs'][0]['stacktrace']) {
    alert(JSON.stringify(aStacktrace, null, '  '));
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
