import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { ActivatedRoute, Router } from '@angular/router';
import { ImpersonationStorageService } from '@ghostfolio/client/services/impersonation-storage.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { User } from '@ghostfolio/common/interfaces';
import { AdminPlatformsItem } from '@ghostfolio/common/interfaces/admin-platforms.interface';

import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { Platform as PlatformModel } from '@prisma/client';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'gf-platform-overview',
  styleUrls: ['./platform.component.scss'],
  templateUrl: './platform.component.html'
})
export class AdminPlatformComponent implements OnInit {
  @ViewChild(MatSort) sort: MatSort;

  public displayedColumns = ['id', 'name', 'url'];

  public platforms: PlatformModel[];
  public hasPermissionToCreatePlatform: boolean;
  public hasPermissionToDeletePlatform: boolean;
  public hasImpersonationId: boolean;
  public user: User;

  public dataSource: MatTableDataSource<AdminPlatformsItem> =
    new MatTableDataSource();

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private userService: UserService,
    private impersonationStorageService: ImpersonationStorageService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.route.queryParams
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((params) => {
        if (params['platformId'] && params['platformDetailDialog']) {
          // this.openAccountDetailDialog(params['accountId']);
        } else if (
          params['createDialog'] &&
          this.hasPermissionToCreatePlatform
        ) {
          //this.openCreateAccountDialog();
        } else if (params['editDialog']) {
          if (this.platforms) {
            const platform = this.platforms.find(({ id }) => {
              return id === params['platformId'];
            });

            // this.openUpdateAccountDialog(account);
          } else {
            this.router.navigate(['.'], { relativeTo: this.route });
          }
        }
      });
  }

  public ngOnInit() {
    this.impersonationStorageService
      .onChangeHasImpersonation()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((impersonationId) => {
        this.hasImpersonationId = !!impersonationId;
      });

    this.userService.stateChanged
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((state) => {
        if (state?.user) {
          this.user = state.user;

          this.hasPermissionToCreatePlatform = hasPermission(
            this.user.permissions,
            permissions.createPlatform
          );
          this.hasPermissionToCreatePlatform = hasPermission(
            this.user.permissions,
            permissions.deletePlatform
          );

          this.changeDetectorRef.markForCheck();
        }
      });

    this.fetchPlatforms();
  }

  private fetchPlatforms() {}
}
