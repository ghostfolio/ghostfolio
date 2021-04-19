import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { hasPermission, permissions } from '@ghostfolio/helper';
import { InfoItem } from 'apps/api/src/app/info/interfaces/info-item.interface';
import { User } from 'apps/api/src/app/user/interfaces/user.interface';
import { EMPTY, Subject } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';

import { LoginWithAccessTokenDialog } from '../../pages/login/login-with-access-token-dialog/login-with-access-token-dialog.component';
import { DataService } from '../../services/data.service';
import { ImpersonationStorageService } from '../../services/impersonation-storage.service';
import { TokenStorageService } from '../../services/token-storage.service';

@Component({
  selector: 'gf-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnChanges {
  @Input() currentRoute: string;
  @Input() info: InfoItem;
  @Input() user: User;

  public canAccessAdminAccessControl: boolean;
  public hasPermissionToUseSocialLogin: boolean;
  public impersonationId: string;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private dataService: DataService,
    private dialog: MatDialog,
    private impersonationStorageService: ImpersonationStorageService,
    private router: Router,
    private tokenStorageService: TokenStorageService
  ) {
    this.impersonationStorageService
      .onChangeHasImpersonation()
      .subscribe((id) => {
        this.impersonationId = id;
      });
  }

  public ngOnChanges() {
    if (this.user) {
      this.canAccessAdminAccessControl = hasPermission(
        this.user.permissions,
        permissions.accessAdminControl
      );
    }

    this.hasPermissionToUseSocialLogin = hasPermission(
      this.info?.globalPermissions,
      permissions.useSocialLogin
    );
  }

  public impersonateAccount(aId: string) {
    if (aId) {
      this.impersonationStorageService.setId(aId);
    } else {
      this.impersonationStorageService.removeId();
    }

    window.location.reload();
  }

  public onSignOut() {
    this.tokenStorageService.signOut();
    window.location.reload();
  }

  public openLoginDialog(): void {
    const dialogRef = this.dialog.open(LoginWithAccessTokenDialog, {
      autoFocus: false,
      data: {
        accessToken: '',
        hasPermissionToUseSocialLogin: this.hasPermissionToUseSocialLogin
      },
      width: '30rem'
    });

    dialogRef.afterClosed().subscribe((data) => {
      if (data?.accessToken) {
        this.dataService
          .loginAnonymous(data?.accessToken)
          .pipe(
            catchError(() => {
              alert('Oops! Incorrect Security Token.');

              return EMPTY;
            }),
            takeUntil(this.unsubscribeSubject)
          )
          .subscribe(({ authToken }) => {
            this.setToken(authToken);
          });
      }
    });
  }

  public setToken(aToken: string) {
    this.tokenStorageService.saveToken(aToken);

    this.router.navigate(['/']);
  }
}
