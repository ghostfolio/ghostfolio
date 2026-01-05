import { UserService } from '@ghostfolio/client/services/user/user.service';
import {
  DATA_GATHERING_QUEUE_PRIORITY_HIGH,
  DATA_GATHERING_QUEUE_PRIORITY_LOW,
  DATA_GATHERING_QUEUE_PRIORITY_MEDIUM,
  QUEUE_JOB_STATUS_LIST
} from '@ghostfolio/common/config';
import { getDateWithTimeFormatString } from '@ghostfolio/common/helper';
import { AdminJobs, User } from '@ghostfolio/common/interfaces';
import { NotificationService } from '@ghostfolio/ui/notifications';
import { AdminService } from '@ghostfolio/ui/services';

import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { IonIcon } from '@ionic/angular/standalone';
import { JobStatus } from 'bull';
import { addIcons } from 'ionicons';
import {
  alertCircleOutline,
  cafeOutline,
  checkmarkCircleOutline,
  chevronDownCircleOutline,
  chevronUpCircleOutline,
  ellipsisHorizontal,
  ellipsisVertical,
  pauseOutline,
  playOutline,
  removeCircleOutline,
  timeOutline
} from 'ionicons/icons';
import { get } from 'lodash';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    IonIcon,
    MatButtonModule,
    MatMenuModule,
    MatSelectModule,
    MatSortModule,
    MatTableModule,
    NgxSkeletonLoaderModule,
    ReactiveFormsModule
  ],
  selector: 'gf-admin-jobs',
  styleUrls: ['./admin-jobs.scss'],
  templateUrl: './admin-jobs.html'
})
export class GfAdminJobsComponent implements OnDestroy, OnInit {
  @ViewChild(MatSort) sort: MatSort;

  public DATA_GATHERING_QUEUE_PRIORITY_LOW = DATA_GATHERING_QUEUE_PRIORITY_LOW;
  public DATA_GATHERING_QUEUE_PRIORITY_HIGH =
    DATA_GATHERING_QUEUE_PRIORITY_HIGH;
  public DATA_GATHERING_QUEUE_PRIORITY_MEDIUM =
    DATA_GATHERING_QUEUE_PRIORITY_MEDIUM;

  public dataSource = new MatTableDataSource<AdminJobs['jobs'][0]>();
  public defaultDateTimeFormat: string;
  public filterForm: FormGroup;
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
  public isLoading = false;
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

    addIcons({
      alertCircleOutline,
      cafeOutline,
      checkmarkCircleOutline,
      chevronDownCircleOutline,
      chevronUpCircleOutline,
      ellipsisHorizontal,
      ellipsisVertical,
      pauseOutline,
      playOutline,
      removeCircleOutline,
      timeOutline
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
    this.isLoading = true;

    this.adminService
      .fetchJobs({ status: aStatus })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(({ jobs }) => {
        this.dataSource = new MatTableDataSource(jobs);
        this.dataSource.sort = this.sort;
        this.dataSource.sortingDataAccessor = get;

        this.isLoading = false;

        this.changeDetectorRef.markForCheck();
      });
  }
}
