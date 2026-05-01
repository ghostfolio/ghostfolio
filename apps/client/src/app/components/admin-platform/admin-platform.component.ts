import { UserService } from '@ghostfolio/client/services/user/user.service';
import { CreatePlatformDto, UpdatePlatformDto } from '@ghostfolio/common/dtos';
import { ConfirmationDialogType } from '@ghostfolio/common/enums';
import { getLocale } from '@ghostfolio/common/helper';
import { GfEntityLogoComponent } from '@ghostfolio/ui/entity-logo';
import { NotificationService } from '@ghostfolio/ui/notifications';
import { AdminService, DataService } from '@ghostfolio/ui/services';
import { GfValueComponent } from '@ghostfolio/ui/value';

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  Input,
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
import { IonIcon } from '@ionic/angular/standalone';
import { Platform } from '@prisma/client';
import { addIcons } from 'ionicons';
import {
  createOutline,
  ellipsisHorizontal,
  trashOutline
} from 'ionicons/icons';
import { get } from 'lodash';
import { DeviceDetectorService } from 'ngx-device-detector';

import { GfCreateOrUpdatePlatformDialogComponent } from './create-or-update-platform-dialog/create-or-update-platform-dialog.component';
import { CreateOrUpdatePlatformDialogParams } from './create-or-update-platform-dialog/interfaces/interfaces';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    GfEntityLogoComponent,
    GfValueComponent,
    IonIcon,
    MatButtonModule,
    MatMenuModule,
    MatSortModule,
    MatTableModule,
    RouterModule
  ],
  selector: 'gf-admin-platform',
  styleUrls: ['./admin-platform.component.scss'],
  templateUrl: './admin-platform.component.html'
})
export class GfAdminPlatformComponent implements OnInit {
  @Input() locale = getLocale();

  @ViewChild(MatSort) sort: MatSort;

  public dataSource = new MatTableDataSource<Platform>();
  public deviceType: string;
  public displayedColumns = ['name', 'url', 'accounts', 'actions'];
  public platforms: Platform[];

  public constructor(
    private adminService: AdminService,
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private destroyRef: DestroyRef,
    private deviceDetectorService: DeviceDetectorService,
    private dialog: MatDialog,
    private notificationService: NotificationService,
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService
  ) {
    this.route.queryParams
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        if (params['createPlatformDialog']) {
          this.openCreatePlatformDialog();
        } else if (params['editPlatformDialog']) {
          if (this.platforms) {
            const platform = this.platforms.find(({ id }) => {
              return id === params['platformId'];
            });

            this.openUpdatePlatformDialog(platform);
          } else {
            this.router.navigate(['.'], { relativeTo: this.route });
          }
        }
      });

    addIcons({ createOutline, ellipsisHorizontal, trashOutline });
  }

  public ngOnInit() {
    this.deviceType = this.deviceDetectorService.getDeviceInfo().deviceType;

    this.fetchPlatforms();
  }

  public onDeletePlatform(aId: string) {
    this.notificationService.confirm({
      confirmFn: () => {
        this.deletePlatform(aId);
      },
      confirmType: ConfirmationDialogType.Warn,
      title: $localize`Do you really want to delete this platform?`
    });
  }

  public onUpdatePlatform({ id }: Platform) {
    this.router.navigate([], {
      queryParams: { editPlatformDialog: true, platformId: id }
    });
  }

  private deletePlatform(aId: string) {
    this.adminService
      .deletePlatform(aId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.userService
            .get(true)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe();

          this.fetchPlatforms();
        }
      });
  }

  private fetchPlatforms() {
    this.adminService
      .fetchPlatforms()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((platforms) => {
        this.platforms = platforms;

        this.dataSource = new MatTableDataSource(platforms);
        this.dataSource.sort = this.sort;
        this.dataSource.sortingDataAccessor = get;

        this.dataService.updateInfo();

        this.changeDetectorRef.markForCheck();
      });
  }

  private openCreatePlatformDialog() {
    const dialogRef = this.dialog.open<
      GfCreateOrUpdatePlatformDialogComponent,
      CreateOrUpdatePlatformDialogParams
    >(GfCreateOrUpdatePlatformDialogComponent, {
      data: {
        platform: {
          id: null,
          name: null,
          url: null
        }
      },
      height: this.deviceType === 'mobile' ? '98vh' : undefined,
      width: this.deviceType === 'mobile' ? '100vw' : '50rem'
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((platform: CreatePlatformDto | null) => {
        if (platform) {
          this.adminService
            .postPlatform(platform)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: () => {
                this.userService
                  .get(true)
                  .pipe(takeUntilDestroyed(this.destroyRef))
                  .subscribe();

                this.fetchPlatforms();
              }
            });
        }

        this.router.navigate(['.'], { relativeTo: this.route });
      });
  }

  private openUpdatePlatformDialog({
    id,
    name,
    url
  }: {
    id: string;
    name: string;
    url: string;
  }) {
    const dialogRef = this.dialog.open<
      GfCreateOrUpdatePlatformDialogComponent,
      CreateOrUpdatePlatformDialogParams
    >(GfCreateOrUpdatePlatformDialogComponent, {
      data: {
        platform: {
          id,
          name,
          url
        }
      },
      height: this.deviceType === 'mobile' ? '98vh' : undefined,
      width: this.deviceType === 'mobile' ? '100vw' : '50rem'
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((platform: UpdatePlatformDto | null) => {
        if (platform) {
          this.adminService
            .putPlatform(platform)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: () => {
                this.userService
                  .get(true)
                  .pipe(takeUntilDestroyed(this.destroyRef))
                  .subscribe();

                this.fetchPlatforms();
              }
            });
        }

        this.router.navigate(['.'], { relativeTo: this.route });
      });
  }
}
