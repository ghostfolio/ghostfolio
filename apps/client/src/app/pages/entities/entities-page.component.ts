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

import { GfCreateOrUpdateEntityDialogComponent } from './create-or-update-entity-dialog/create-or-update-entity-dialog.component';
import { CreateOrUpdateEntityDialogParams } from './create-or-update-entity-dialog/interfaces/interfaces';

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
  selector: 'gf-entities-page',
  styleUrls: ['./entities-page.scss'],
  templateUrl: './entities-page.html'
})
export class GfEntitiesPageComponent implements OnInit {
  public dataSource = new MatTableDataSource<any>([]);
  public deviceType: string;
  public displayedColumns = [
    'name',
    'type',
    'taxId',
    'ownershipsCount',
    'membershipsCount',
    'actions'
  ];
  public entities: any[];
  public hasPermissionToCreate = false;
  public hasPermissionToUpdate = false;
  public hasPermissionToDelete = false;
  public isLoading = true;
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
          this.openCreateEntityDialog();
        } else if (params['editDialog']) {
          const entity = this.entities?.find(
            (e) => e.id === params['entityId']
          );
          if (entity) {
            this.openUpdateEntityDialog(entity);
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
            permissions.createEntity
          );
          this.hasPermissionToUpdate = hasPermission(
            this.user.permissions,
            permissions.updateEntity
          );
          this.hasPermissionToDelete = hasPermission(
            this.user.permissions,
            permissions.deleteEntity
          );
          this.showActions =
            this.hasPermissionToUpdate || this.hasPermissionToDelete;
          this.changeDetectorRef.markForCheck();
        }
      });

    this.fetchEntities();
  }

  public fetchEntities() {
    this.isLoading = true;
    this.familyOfficeDataService
      .fetchEntities()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((entities) => {
        this.entities = entities;
        this.dataSource.data = entities;
        this.dataSource.sort = this.sort;
        this.isLoading = false;

        if (this.entities?.length <= 0) {
          this.router.navigate([], {
            queryParams: { createDialog: true }
          });
        }

        this.changeDetectorRef.markForCheck();
      });
  }

  public onDeleteEntity(entityId: string) {
    this.notificationService.confirm({
      confirmFn: () => {
        this.familyOfficeDataService
          .deleteEntity(entityId)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe(() => {
            this.reset();
            this.fetchEntities();
          });
      },
      confirmType: undefined,
      message: $localize`Do you really want to delete this entity?`,
      title: $localize`Delete Entity`
    });
  }

  public onEntityClicked(entity: any) {
    this.router.navigate(['/entities', entity.id]);
  }

  public onUpdateEntity(entity: any) {
    this.router.navigate([], {
      queryParams: { entityId: entity.id, editDialog: true }
    });
  }

  private openCreateEntityDialog() {
    const dialogRef = this.dialog.open(GfCreateOrUpdateEntityDialogComponent, {
      data: {
        entity: {
          id: null,
          name: '',
          type: 'INDIVIDUAL',
          taxId: ''
        }
      } as CreateOrUpdateEntityDialogParams,
      height: this.deviceType === 'mobile' ? '98vh' : '80vh',
      width: this.deviceType === 'mobile' ? '100vw' : '50rem'
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        this.router.navigate(['.'], { relativeTo: this.route });

        if (result) {
          this.familyOfficeDataService
            .createEntity(result)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
              this.reset();
              this.fetchEntities();
            });
        }
      });
  }

  private openUpdateEntityDialog(entity: any) {
    const dialogRef = this.dialog.open(GfCreateOrUpdateEntityDialogComponent, {
      data: {
        entity: {
          id: entity.id,
          name: entity.name,
          type: entity.type,
          taxId: entity.taxId ?? ''
        }
      } as CreateOrUpdateEntityDialogParams,
      height: this.deviceType === 'mobile' ? '98vh' : '80vh',
      width: this.deviceType === 'mobile' ? '100vw' : '50rem'
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        this.router.navigate(['.'], { relativeTo: this.route });

        if (result) {
          this.familyOfficeDataService
            .updateEntity(entity.id, result)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
              this.reset();
              this.fetchEntities();
            });
        }
      });
  }

  private reset() {
    this.entities = undefined;
    this.dataSource.data = [];
  }
}
