import { GfPortfolioSummaryComponent } from '@ghostfolio/client/components/portfolio-summary/portfolio-summary.component';
import { ImpersonationStorageService } from '@ghostfolio/client/services/impersonation-storage.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import {
  InfoItem,
  PortfolioSummary,
  User
} from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { DataService } from '@ghostfolio/ui/services';

import {
  ChangeDetectorRef,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  DestroyRef,
  OnInit
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBarRef, TextOnlySnackBar } from '@angular/material/snack-bar';
import { DeviceDetectorService } from 'ngx-device-detector';

@Component({
  imports: [GfPortfolioSummaryComponent, MatCardModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'gf-home-summary',
  styleUrls: ['./home-summary.scss'],
  templateUrl: './home-summary.html'
})
export class GfHomeSummaryComponent implements OnInit {
  public deviceType: string;
  public hasImpersonationId: boolean;
  public hasPermissionForSubscription: boolean;
  public hasPermissionToUpdateUserSettings: boolean;
  public info: InfoItem;
  public isLoading = true;
  public snackBarRef: MatSnackBarRef<TextOnlySnackBar>;
  public summary: PortfolioSummary;
  public user: User;

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private destroyRef: DestroyRef,
    private deviceService: DeviceDetectorService,
    private impersonationStorageService: ImpersonationStorageService,
    private userService: UserService
  ) {
    this.info = this.dataService.fetchInfo();

    this.hasPermissionForSubscription = hasPermission(
      this.info?.globalPermissions,
      permissions.enableSubscription
    );

    this.userService.stateChanged
      .pipe(takeUntilDestroyed(this.destroyRef))
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
    this.deviceType = this.deviceService.getDeviceInfo().deviceType;

    this.impersonationStorageService
      .onChangeHasImpersonation()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((impersonationId) => {
        this.hasImpersonationId = !!impersonationId;
      });
  }

  public onChangeEmergencyFund(emergencyFund: number) {
    this.dataService
      .putUserSetting({ emergencyFund })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.userService
          .get(true)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe((user) => {
            this.user = user;

            this.changeDetectorRef.markForCheck();
          });
      });
  }

  private update() {
    this.isLoading = true;

    this.dataService
      .fetchPortfolioDetails()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ summary }) => {
        this.summary = summary;
        this.isLoading = false;

        this.changeDetectorRef.markForCheck();
      });

    this.changeDetectorRef.markForCheck();
  }
}
