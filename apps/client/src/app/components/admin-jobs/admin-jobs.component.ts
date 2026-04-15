import { TokenStorageService } from '@ghostfolio/client/services/token-storage.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import {
  BULL_BOARD_COOKIE_NAME,
  BULL_BOARD_ROUTE,
  DATA_GATHERING_QUEUE_PRIORITY_HIGH,
  DATA_GATHERING_QUEUE_PRIORITY_LOW,
  DATA_GATHERING_QUEUE_PRIORITY_MEDIUM,
  QUEUE_JOB_STATUS_LIST
} from '@ghostfolio/common/config';
import { getDateWithTimeFormatString } from '@ghostfolio/common/helper';
import { AdminJobs, User } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { NotificationService } from '@ghostfolio/ui/notifications';
import { AdminService } from '@ghostfolio/ui/services';

import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit,
  ViewChild
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  FormControl,
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
  openOutline,
  pauseOutline,
  playOutline,
  removeCircleOutline,
  timeOutline
} from 'ionicons/icons';
import { get } from 'lodash';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

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
export class GfAdminJobsComponent implements OnInit {
  @ViewChild(MatSort) sort: MatSort;

  protected readonly DATA_GATHERING_QUEUE_PRIORITY_LOW =
    DATA_GATHERING_QUEUE_PRIORITY_LOW;
  protected readonly DATA_GATHERING_QUEUE_PRIORITY_HIGH =
    DATA_GATHERING_QUEUE_PRIORITY_HIGH;
  protected readonly DATA_GATHERING_QUEUE_PRIORITY_MEDIUM =
    DATA_GATHERING_QUEUE_PRIORITY_MEDIUM;

  protected dataSource = new MatTableDataSource<AdminJobs['jobs'][0]>();
  protected defaultDateTimeFormat: string;
  protected filterForm: FormGroup<{
    status: FormControl<JobStatus | null>;
  }>;

  protected readonly displayedColumns = [
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

  protected hasPermissionToAccessBullBoard = false;
  protected isLoading = false;
  protected readonly statusFilterOptions = QUEUE_JOB_STATUS_LIST;

  private user: User;

  public constructor(
    private adminService: AdminService,
    private changeDetectorRef: ChangeDetectorRef,
    private destroyRef: DestroyRef,
    private formBuilder: FormBuilder,
    private notificationService: NotificationService,
    private tokenStorageService: TokenStorageService,
    private userService: UserService
  ) {
    this.userService.stateChanged
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => {
        if (state?.user) {
          this.user = state.user;

          this.defaultDateTimeFormat = getDateWithTimeFormatString(
            this.user.settings.locale
          );

          this.hasPermissionToAccessBullBoard = hasPermission(
            this.user.permissions,
            permissions.accessAdminControlBullBoard
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
      openOutline,
      pauseOutline,
      playOutline,
      removeCircleOutline,
      timeOutline
    });
  }

  public ngOnInit() {
    this.filterForm = this.formBuilder.group({
      status: new FormControl<JobStatus | null>(null)
    });

    this.filterForm.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const currentFilter = this.filterForm.controls.status.value;
        this.fetchJobs(currentFilter ? [currentFilter] : undefined);
      });

    this.fetchJobs();
  }

  protected onDeleteJob(aId: string) {
    this.adminService
      .deleteJob(aId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.fetchJobs();
      });
  }

  protected onDeleteJobs() {
    const currentFilter = this.filterForm.controls.status.value;

    this.adminService
      .deleteJobs({ status: currentFilter ? [currentFilter] : [] })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.fetchJobs(currentFilter ? [currentFilter] : undefined);
      });
  }

  protected onExecuteJob(aId: string) {
    this.adminService
      .executeJob(aId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.fetchJobs();
      });
  }

  protected onOpenBullBoard() {
    const token = this.tokenStorageService.getToken();

    document.cookie = [
      `${BULL_BOARD_COOKIE_NAME}=${encodeURIComponent(token)}`,
      'path=/',
      'SameSite=Strict'
    ].join('; ');

    window.open(BULL_BOARD_ROUTE, '_blank');
  }

  protected onViewData(aData: AdminJobs['jobs'][0]['data']) {
    this.notificationService.alert({
      title: JSON.stringify(aData, null, '  ')
    });
  }

  protected onViewStacktrace(aStacktrace: AdminJobs['jobs'][0]['stacktrace']) {
    this.notificationService.alert({
      title: JSON.stringify(aStacktrace, null, '  ')
    });
  }

  private fetchJobs(aStatus?: JobStatus[]) {
    this.isLoading = true;

    this.adminService
      .fetchJobs({ status: aStatus })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ jobs }) => {
        this.dataSource = new MatTableDataSource(jobs);
        this.dataSource.sort = this.sort;
        this.dataSource.sortingDataAccessor = get;

        this.isLoading = false;

        this.changeDetectorRef.markForCheck();
      });
  }
}
