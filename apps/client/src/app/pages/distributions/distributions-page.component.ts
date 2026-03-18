import { FamilyOfficeDataService } from '@ghostfolio/client/services/family-office-data.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { User } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { NotificationService } from '@ghostfolio/ui/notifications';

import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { addIcons } from 'ionicons';
import { addOutline, ellipsisVerticalOutline } from 'ionicons/icons';
import { DeviceDetectorService } from 'ngx-device-detector';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

import { GfCreateDistributionDialogComponent } from './create-distribution-dialog/create-distribution-dialog.component';
import { CreateDistributionDialogParams } from './create-distribution-dialog/interfaces/interfaces';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'has-fab page' },
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatMenuModule,
    MatSelectModule,
    MatSortModule,
    MatTableModule,
    NgxSkeletonLoaderModule,
    RouterModule
  ],
  selector: 'gf-distributions-page',
  styleUrls: ['./distributions-page.scss'],
  templateUrl: './distributions-page.html'
})
export class GfDistributionsPageComponent implements OnInit {
  public dataSource = new MatTableDataSource<any>();
  public deviceType: string;
  public displayedColumns = [
    'date',
    'entityName',
    'partnershipName',
    'type',
    'amount',
    'netAmount',
    'actions'
  ];
  public entities: any[] = [];
  public filterType: string | undefined;
  public groupBy: string | undefined;
  public hasPermissionToCreate = false;
  public hasPermissionToDelete = false;
  public isLoading = true;
  public partnerships: any[] = [];
  public summary: any;
  public user: User;

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private destroyRef: DestroyRef,
    private deviceService: DeviceDetectorService,
    private dialog: MatDialog,
    private familyOfficeDataService: FamilyOfficeDataService,
    private notificationService: NotificationService,
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService
  ) {
    addIcons({ addOutline, ellipsisVerticalOutline });
    this.deviceType = this.deviceService.getDeviceInfo().deviceType;

    this.route.queryParams
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        if (params['createDialog']) {
          this.openCreateDistributionDialog();
        }
      });
  }

  public ngOnInit() {
    this.userService.stateChanged
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => {
        if (state?.user) {
          this.user = state.user;
          this.hasPermissionToCreate = hasPermission(
            this.user.permissions,
            permissions.createDistribution
          );
          this.hasPermissionToDelete = hasPermission(
            this.user.permissions,
            permissions.deleteDistribution
          );
          this.changeDetectorRef.markForCheck();
        }
      });

    this.fetchDistributions();
    this.fetchEntitiesAndPartnerships();
  }

  public fetchDistributions() {
    this.isLoading = true;

    this.familyOfficeDataService
      .fetchDistributions({
        type: this.filterType,
        groupBy: this.groupBy
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result: any) => {
        this.dataSource.data = result.distributions ?? [];
        this.summary = result.summary;
        this.isLoading = false;
        this.changeDetectorRef.markForCheck();
      });
  }

  public onDeleteDistribution(distributionId: string) {
    this.notificationService.confirm({
      confirmFn: () => {
        this.familyOfficeDataService
          .deleteDistribution(distributionId)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe(() => {
            this.fetchDistributions();
          });
      },
      confirmType: undefined,
      message: $localize`Do you really want to delete this distribution?`,
      title: $localize`Delete Distribution`
    });
  }

  private fetchEntitiesAndPartnerships() {
    this.familyOfficeDataService
      .fetchEntities()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((entities) => {
        this.entities = entities;
        this.changeDetectorRef.markForCheck();
      });

    this.familyOfficeDataService
      .fetchPartnerships()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((partnerships) => {
        this.partnerships = partnerships;
        this.changeDetectorRef.markForCheck();
      });
  }

  private openCreateDistributionDialog() {
    const dialogRef = this.dialog.open(GfCreateDistributionDialogComponent, {
      data: {
        entities: this.entities,
        partnerships: this.partnerships
      } as CreateDistributionDialogParams,
      height: this.deviceType === 'mobile' ? '98vh' : '80vh',
      width: this.deviceType === 'mobile' ? '100vw' : '50rem'
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        this.router.navigate([], { queryParams: {} });

        if (result) {
          this.familyOfficeDataService
            .createDistribution(result)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
              this.fetchDistributions();
            });
        }
      });
  }
}
