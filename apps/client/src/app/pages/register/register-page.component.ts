import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { DataService } from '@ghostfolio/client/services/data.service';
import { TokenStorageService } from '@ghostfolio/client/services/token-storage.service';
import { InfoItem } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { LineChartItem } from '@ghostfolio/ui/line-chart/interfaces/line-chart.interface';
import { Role } from '@prisma/client';
import { format } from 'date-fns';
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
  public currentYear = format(new Date(), 'yyyy');
  public demoAuthToken: string;
  public deviceType: string;
  public hasPermissionForSocialLogin: boolean;
  public historicalDataItems: LineChartItem[];
  public info: InfoItem;

  private unsubscribeSubject = new Subject<void>();

  /**
   * @constructor
   */
  public constructor(
    private dataService: DataService,
    private deviceService: DeviceDetectorService,
    private dialog: MatDialog,
    private router: Router,
    private tokenStorageService: TokenStorageService
  ) {
    this.info = this.dataService.fetchInfo();

    this.tokenStorageService.signOut();
  }

  /**
   * Initializes the controller
   */
  public ngOnInit() {
    const { demoAuthToken, globalPermissions } = this.dataService.fetchInfo();

    this.demoAuthToken = demoAuthToken;
    this.deviceType = this.deviceService.getDeviceInfo().deviceType;
    this.hasPermissionForSocialLogin = hasPermission(
      globalPermissions,
      permissions.enableSocialLogin
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

  public openShowAccessTokenDialog(
    accessToken: string,
    authToken: string,
    role: Role
  ): void {
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
