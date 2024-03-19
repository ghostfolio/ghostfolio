import { CreatePlatformDto } from '@ghostfolio/api/app/platform/create-platform.dto';
import { UpdatePlatformDto } from '@ghostfolio/api/app/platform/update-platform.dto';
import { AdminService } from '@ghostfolio/client/services/admin.service';
import { DataService } from '@ghostfolio/client/services/data.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { ActivatedRoute, Router } from '@angular/router';
import { Platform } from '@prisma/client';
import { get } from 'lodash';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Subject, takeUntil } from 'rxjs';

import { CreateOrUpdatePlatformDialog } from './create-or-update-platform-dialog/create-or-update-platform-dialog.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'gf-admin-platform',
  styleUrls: ['./admin-platform.component.scss'],
  templateUrl: './admin-platform.component.html'
})
export class AdminPlatformComponent implements OnInit, OnDestroy {
  @ViewChild(MatSort) sort: MatSort;

  public dataSource: MatTableDataSource<Platform> = new MatTableDataSource();
  public deviceType: string;
  public displayedColumns = ['name', 'url', 'accounts', 'actions'];
  public platforms: Platform[];

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private adminService: AdminService,
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private deviceService: DeviceDetectorService,
    private dialog: MatDialog,
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService
  ) {
    this.route.queryParams
      .pipe(takeUntil(this.unsubscribeSubject))
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
  }

  public ngOnInit() {
    this.deviceType = this.deviceService.getDeviceInfo().deviceType;

    this.fetchPlatforms();
  }

  public onDeletePlatform(aId: string) {
    const confirmation = confirm(
      $localize`Do you really want to delete this platform?`
    );

    if (confirmation) {
      this.deletePlatform(aId);
    }
  }

  public onUpdatePlatform({ id }: Platform) {
    this.router.navigate([], {
      queryParams: { editPlatformDialog: true, platformId: id }
    });
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  private deletePlatform(aId: string) {
    this.adminService
      .deletePlatform(aId)
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe({
        next: () => {
          this.userService
            .get(true)
            .pipe(takeUntil(this.unsubscribeSubject))
            .subscribe();

          this.fetchPlatforms();
        }
      });
  }

  private fetchPlatforms() {
    this.adminService
      .fetchPlatforms()
      .pipe(takeUntil(this.unsubscribeSubject))
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
    const dialogRef = this.dialog.open(CreateOrUpdatePlatformDialog, {
      data: {
        platform: {
          name: null,
          url: null
        }
      },
      height: this.deviceType === 'mobile' ? '97.5vh' : '80vh',
      width: this.deviceType === 'mobile' ? '100vw' : '50rem'
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((data) => {
        const platform: CreatePlatformDto = data?.platform;

        if (platform) {
          this.adminService
            .postPlatform(platform)
            .pipe(takeUntil(this.unsubscribeSubject))
            .subscribe({
              next: () => {
                this.userService
                  .get(true)
                  .pipe(takeUntil(this.unsubscribeSubject))
                  .subscribe();

                this.fetchPlatforms();
              }
            });
        }

        this.router.navigate(['.'], { relativeTo: this.route });
      });
  }

  private openUpdatePlatformDialog({ id, name, url }) {
    const dialogRef = this.dialog.open(CreateOrUpdatePlatformDialog, {
      data: {
        platform: {
          id,
          name,
          url
        }
      },
      height: this.deviceType === 'mobile' ? '97.5vh' : '80vh',
      width: this.deviceType === 'mobile' ? '100vw' : '50rem'
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((data) => {
        const platform: UpdatePlatformDto = data?.platform;

        if (platform) {
          this.adminService
            .putPlatform(platform)
            .pipe(takeUntil(this.unsubscribeSubject))
            .subscribe({
              next: () => {
                this.userService
                  .get(true)
                  .pipe(takeUntil(this.unsubscribeSubject))
                  .subscribe();

                this.fetchPlatforms();
              }
            });
        }

        this.router.navigate(['.'], { relativeTo: this.route });
      });
  }
}
