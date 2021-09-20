import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { DataService } from '@ghostfolio/client/services/data.service';
import { TokenStorageService } from '@ghostfolio/client/services/token-storage.service';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { LineChartItem } from '@ghostfolio/ui/line-chart/interfaces/line-chart.interface';
import { format } from 'date-fns';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { ShowAccessTokenDialog } from './show-access-token-dialog/show-access-token-dialog.component';

@Component({
  selector: 'gf-register-page',
  templateUrl: './register-page.html',
  styleUrls: ['./register-page.scss']
})
export class RegisterPageComponent implements OnDestroy, OnInit {
  public currentYear = format(new Date(), 'yyyy');
  public demoAuthToken: string;
  public hasPermissionForSocialLogin: boolean;
  public historicalDataItems: LineChartItem[];

  private unsubscribeSubject = new Subject<void>();

  /**
   * @constructor
   */
  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private dialog: MatDialog,
    private router: Router,
    private tokenStorageService: TokenStorageService
  ) {
    this.tokenStorageService.signOut();
  }

  /**
   * Initializes the controller
   */
  public ngOnInit() {
    const { demoAuthToken, globalPermissions } = this.dataService.fetchInfo();

    this.demoAuthToken = demoAuthToken;
    this.hasPermissionForSocialLogin = hasPermission(
      globalPermissions,
      permissions.enableSocialLogin
    );
  }

  public async createAccount() {
    this.dataService
      .postUser()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(({ accessToken, authToken }) => {
        this.openShowAccessTokenDialog(accessToken, authToken);
      });
  }

  public openShowAccessTokenDialog(
    accessToken: string,
    authToken: string
  ): void {
    const dialogRef = this.dialog.open(ShowAccessTokenDialog, {
      data: {
        accessToken,
        authToken
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
