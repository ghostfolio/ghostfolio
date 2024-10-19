import { DataService } from '@ghostfolio/client/services/data.service';
import { ImpersonationStorageService } from '@ghostfolio/client/services/impersonation-storage.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import {
  InfoItem,
  PortfolioSummary,
  User
} from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';

import { ChangeDetectorRef, Component, OnDestroy } from '@angular/core';
import { MatSnackBarRef, TextOnlySnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'gf-home-summary',
  styleUrls: ['./home-summary.scss'],
  templateUrl: './home-summary.html'
})
export class HomeSummaryComponent implements OnDestroy{
  public hasImpersonationId: boolean;
  public hasPermissionForSubscription: boolean;
  public hasPermissionToUpdateUserSettings: boolean;
  public info: InfoItem;
  public isLoading = true;
  public snackBarRef: MatSnackBarRef<TextOnlySnackBar>;
  public summary: PortfolioSummary;
  public user: User;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private impersonationStorageService: ImpersonationStorageService,
    private userService: UserService
  ) {
    this.info = this.dataService.fetchInfo();

    this.hasPermissionForSubscription = hasPermission(
      this.info?.globalPermissions,
      permissions.enableSubscription
    );

    this.userService.stateChanged
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((state) => {
        if (state?.user) {
          this.user = state.user;

          this.hasPermissionToUpdateUserSettings = hasPermission(
            this.user.permissions,
            permissions.updateUserSettings
          );

          this.update();
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
  }

  public onChangeEmergencyFund(emergencyFund: number) {
    this.dataService
      .putUserSetting({ emergencyFund })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(() => {
        this.userService
          .get(true)
          .pipe(takeUntil(this.unsubscribeSubject))
          .subscribe((user) => {
            this.user = user;

            this.changeDetectorRef.markForCheck();
          });
      });
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  private update() {
    this.isLoading = true;

    this.dataService
      .fetchPortfolioDetails()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(({ summary }) => {
        this.summary = summary;
        this.isLoading = false;

        this.changeDetectorRef.markForCheck();
      });

    this.changeDetectorRef.markForCheck();
  }
}
