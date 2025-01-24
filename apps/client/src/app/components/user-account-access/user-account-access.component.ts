import { CreateAccessDto } from '@ghostfolio/api/app/access/create-access.dto';
import { DataService } from '@ghostfolio/client/services/data.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { Access, User } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { CreateOrUpdateAccessDialog } from './create-or-update-access-dialog/create-or-update-access-dialog.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'has-fab' },
  selector: 'gf-user-account-access',
  styleUrls: ['./user-account-access.scss'],
  templateUrl: './user-account-access.html',
  standalone: false
})
export class UserAccountAccessComponent implements OnDestroy, OnInit {
  public accessesGet: Access[];
  public accessesGive: Access[];
  public deviceType: string;
  public hasPermissionToCreateAccess: boolean;
  public hasPermissionToDeleteAccess: boolean;
  public user: User;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private deviceService: DeviceDetectorService,
    private dialog: MatDialog,
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService
  ) {
    const { globalPermissions } = this.dataService.fetchInfo();

    this.hasPermissionToDeleteAccess = hasPermission(
      globalPermissions,
      permissions.deleteAccess
    );

    this.userService.stateChanged
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((state) => {
        if (state?.user) {
          this.user = state.user;

          this.hasPermissionToCreateAccess = hasPermission(
            this.user.permissions,
            permissions.createAccess
          );

          this.hasPermissionToDeleteAccess = hasPermission(
            this.user.permissions,
            permissions.deleteAccess
          );

          this.changeDetectorRef.markForCheck();
        }
      });

    this.route.queryParams
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((params) => {
        if (params['createDialog']) {
          this.openCreateAccessDialog();
        }
      });
  }

  public ngOnInit() {
    this.deviceType = this.deviceService.getDeviceInfo().deviceType;

    this.update();
  }

  public onDeleteAccess(aId: string) {
    this.dataService
      .deleteAccess(aId)
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe({
        next: () => {
          this.update();
        }
      });
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  private openCreateAccessDialog() {
    const dialogRef = this.dialog.open(CreateOrUpdateAccessDialog, {
      data: {
        access: {
          alias: '',
          permissions: ['READ_RESTRICTED'],
          type: 'PRIVATE'
        }
      },
      height: this.deviceType === 'mobile' ? '98vh' : undefined,
      width: this.deviceType === 'mobile' ? '100vw' : '50rem'
    });

    dialogRef.afterClosed().subscribe((access: CreateAccessDto | null) => {
      if (access) {
        this.update();
      }

      this.router.navigate(['.'], { relativeTo: this.route });
    });
  }

  private update() {
    this.accessesGet = this.user.access.map(({ alias, id, permissions }) => {
      return {
        alias,
        id,
        permissions,
        grantee: $localize`Me`,
        type: 'PRIVATE'
      };
    });

    this.dataService
      .fetchAccesses()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((accesses) => {
        this.accessesGive = accesses;

        this.changeDetectorRef.markForCheck();
      });
  }
}
