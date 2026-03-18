import { FamilyOfficeDataService } from '@ghostfolio/client/services/family-office-data.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { User } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { NotificationService } from '@ghostfolio/ui/notifications';

import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit,
  ViewChild
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { addIcons } from 'ionicons';
import { addOutline, ellipsisVerticalOutline } from 'ionicons/icons';
import { DeviceDetectorService } from 'ngx-device-detector';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

import { GfCreateOrUpdatePartnershipDialogComponent } from './create-or-update-partnership-dialog/create-or-update-partnership-dialog.component';
import { CreateOrUpdatePartnershipDialogParams } from './create-or-update-partnership-dialog/interfaces/interfaces';

@Component({
  host: { class: 'has-fab page' },
  imports: [
    CommonModule,
    MatButtonModule,
    MatMenuModule,
    MatSortModule,
    MatTableModule,
    NgxSkeletonLoaderModule,
    RouterModule
  ],
  selector: 'gf-partnerships-page',
  styleUrls: ['./partnerships-page.scss'],
  templateUrl: './partnerships-page.html'
})
export class GfPartnershipsPageComponent implements OnInit {
  public dataSource = new MatTableDataSource<any>([]);
  public deviceType: string;
  public displayedColumns = [
    'name',
    'type',
    'currency',
    'latestNav',
    'membersCount',
    'actions'
  ];
  public hasPermissionToCreate = false;
  public hasPermissionToUpdate = false;
  public hasPermissionToDelete = false;
  public isLoading = true;
  public partnerships: any[];
  public showActions = false;
  public user: User;

  @ViewChild(MatSort) sort: MatSort;

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
          this.openCreatePartnershipDialog();
        } else if (params['editDialog']) {
          const partnership = this.partnerships?.find(
            (p) => p.id === params['partnershipId']
          );
          if (partnership) {
            this.openUpdatePartnershipDialog(partnership);
          }
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
            permissions.createPartnership
          );
          this.hasPermissionToUpdate = hasPermission(
            this.user.permissions,
            permissions.updatePartnership
          );
          this.hasPermissionToDelete = hasPermission(
            this.user.permissions,
            permissions.deletePartnership
          );
          this.showActions =
            this.hasPermissionToUpdate || this.hasPermissionToDelete;
          this.changeDetectorRef.markForCheck();
        }
      });

    this.fetchPartnerships();
  }

  public fetchPartnerships() {
    this.isLoading = true;
    this.familyOfficeDataService
      .fetchPartnerships()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((partnerships) => {
        this.partnerships = partnerships;
        this.dataSource.data = partnerships;
        this.dataSource.sort = this.sort;
        this.isLoading = false;

        if (this.partnerships?.length <= 0) {
          this.router.navigate([], {
            queryParams: { createDialog: true }
          });
        }

        this.changeDetectorRef.markForCheck();
      });
  }

  public onDeletePartnership(partnershipId: string) {
    this.notificationService.confirm({
      confirmFn: () => {
        this.familyOfficeDataService
          .deletePartnership(partnershipId)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe(() => {
            this.reset();
            this.fetchPartnerships();
          });
      },
      confirmType: undefined,
      message: $localize`Do you really want to delete this partnership?`,
      title: $localize`Delete Partnership`
    });
  }

  public onPartnershipClicked(partnership: any) {
    this.router.navigate(['/partnerships', partnership.id]);
  }

  public onUpdatePartnership(partnership: any) {
    this.router.navigate([], {
      queryParams: { partnershipId: partnership.id, editDialog: true }
    });
  }

  private openCreatePartnershipDialog() {
    const dialogRef = this.dialog.open(
      GfCreateOrUpdatePartnershipDialogComponent,
      {
        data: {
          partnership: {
            id: null,
            name: '',
            type: 'LP',
            currency: 'USD',
            inceptionDate: new Date().toISOString().split('T')[0],
            fiscalYearEnd: 12
          }
        } as CreateOrUpdatePartnershipDialogParams,
        height: this.deviceType === 'mobile' ? '98vh' : '80vh',
        width: this.deviceType === 'mobile' ? '100vw' : '50rem'
      }
    );

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        this.router.navigate(['.'], { relativeTo: this.route });

        if (result) {
          this.familyOfficeDataService
            .createPartnership(result)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
              this.reset();
              this.fetchPartnerships();
            });
        }
      });
  }

  private openUpdatePartnershipDialog(partnership: any) {
    const dialogRef = this.dialog.open(
      GfCreateOrUpdatePartnershipDialogComponent,
      {
        data: {
          partnership: {
            id: partnership.id,
            name: partnership.name,
            type: partnership.type,
            currency: partnership.currency,
            inceptionDate: partnership.inceptionDate ?? '',
            fiscalYearEnd: partnership.fiscalYearEnd ?? 12
          }
        } as CreateOrUpdatePartnershipDialogParams,
        height: this.deviceType === 'mobile' ? '98vh' : '80vh',
        width: this.deviceType === 'mobile' ? '100vw' : '50rem'
      }
    );

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        this.router.navigate(['.'], { relativeTo: this.route });

        if (result) {
          this.familyOfficeDataService
            .updatePartnership(partnership.id, result)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
              this.reset();
              this.fetchPartnerships();
            });
        }
      });
  }

  private reset() {
    this.partnerships = undefined;
    this.dataSource.data = [];
  }
}
