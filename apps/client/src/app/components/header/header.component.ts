import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { LoginWithAccessTokenDialog } from '@ghostfolio/client/components/login-with-access-token-dialog/login-with-access-token-dialog.component';
import { DataService } from '@ghostfolio/client/services/data.service';
import { ImpersonationStorageService } from '@ghostfolio/client/services/impersonation-storage.service';
import { TokenStorageService } from '@ghostfolio/client/services/token-storage.service';
import { WebAuthnService } from '@ghostfolio/client/services/web-authn.service';
import { InfoItem, User } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { EMPTY, Subject } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';

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

  @Output() signOut = new EventEmitter<void>();

  public hasPermissionForSocialLogin: boolean;
  public hasPermissionForSubscription: boolean;
  public hasPermissionToAccessAdminControl: boolean;
  public impersonationId: string;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private dataService: DataService,
    private dialog: MatDialog,
    private impersonationStorageService: ImpersonationStorageService,
    private router: Router,
    private tokenStorageService: TokenStorageService,
    private webAuthnService: WebAuthnService
  ) {
    this.impersonationStorageService
      .onChangeHasImpersonation()
      .subscribe((id) => {
        this.impersonationId = id;
      });
  }

  public ngOnChanges() {
    this.hasPermissionForSocialLogin = hasPermission(
      this.info?.globalPermissions,
      permissions.enableSocialLogin
    );

    this.hasPermissionForSubscription = hasPermission(
      this.info?.globalPermissions,
      permissions.enableSubscription
    );

    this.hasPermissionToAccessAdminControl = hasPermission(
      this.user?.permissions,
      permissions.accessAdminControl
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
    this.signOut.next();
  }

  public openLoginDialog(): void {
    const dialogRef = this.dialog.open(LoginWithAccessTokenDialog, {
      autoFocus: false,
      data: {
        accessToken: '',
        hasPermissionToUseSocialLogin: this.hasPermissionForSocialLogin,
        title: 'Sign in'
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
            this.setToken(authToken, data.staySignedIn);
          });
      }
    });
  }

  public setToken(aToken: string, staySignedIn: boolean) {
    this.tokenStorageService.saveToken(aToken, staySignedIn);

    this.router.navigate(['/']);
  }
}
