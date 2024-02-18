import { DataService } from '@ghostfolio/client/services/data.service';
import { InternetIdentityService } from '@ghostfolio/client/services/internet-identity.service';
import { TokenStorageService } from '@ghostfolio/client/services/token-storage.service';
import { InfoItem, LineChartItem } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';

import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { Role } from '@prisma/client';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { ShowAccessTokenDialog } from './show-access-token-dialog/show-access-token-dialog.component';

@Component({
  host: { class: 'page' },
  selector: 'gf-register-page',
  styleUrls: ['./register-page.scss'],
  templateUrl: './register-page.html'
})
export class RegisterPageComponent implements OnDestroy, OnInit {
  public demoAuthToken: string;
  public deviceType: string;
  public hasPermissionForSocialLogin: boolean;
  public hasPermissionToCreateUser: boolean;
  public historicalDataItems: LineChartItem[];
  public info: InfoItem;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private dataService: DataService,
    private deviceService: DeviceDetectorService,
    private dialog: MatDialog,
    private internetIdentityService: InternetIdentityService,
    private router: Router,
    private tokenStorageService: TokenStorageService
  ) {
    this.info = this.dataService.fetchInfo();

    this.tokenStorageService.signOut();
  }

  public ngOnInit() {
    const { demoAuthToken, globalPermissions } = this.dataService.fetchInfo();

    this.demoAuthToken = demoAuthToken;
    this.deviceType = this.deviceService.getDeviceInfo().deviceType;
    this.hasPermissionForSocialLogin = hasPermission(
      globalPermissions,
      permissions.enableSocialLogin
    );
    this.hasPermissionToCreateUser = hasPermission(
      globalPermissions,
      permissions.createUserAccount
    );
  }

  public async createAccount() {
    this.dataService
      .postUser()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(({ accessToken, authToken, role }) => {
        this.openShowAccessTokenDialog(accessToken, authToken, role);
      });
  }

  public async onLoginWithInternetIdentity() {
    try {
      const { authToken } = await this.internetIdentityService.login();
      this.tokenStorageService.saveToken(authToken);
      this.router.navigate(['/']);
    } catch {}
  }

  public openShowAccessTokenDialog(
    accessToken: string,
    authToken: string,
    role: Role
  ) {
    const dialogRef = this.dialog.open(ShowAccessTokenDialog, {
      data: {
        accessToken,
        authToken,
        role
      },
      disableClose: true,
      width: '30rem'
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((data) => {
        if (data?.authToken) {
          this.tokenStorageService.saveToken(authToken, true);

          this.router.navigate(['/']);
        }
      });
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
