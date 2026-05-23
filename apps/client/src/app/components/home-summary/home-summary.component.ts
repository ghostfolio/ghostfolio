import { GfPortfolioSummaryComponent } from '@ghostfolio/client/components/portfolio-summary/portfolio-summary.component';
import { ImpersonationStorageService } from '@ghostfolio/client/services/impersonation-storage.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { PortfolioSummary, User } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { DataService } from '@ghostfolio/ui/services';

import {
  ChangeDetectorRef,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  DestroyRef,
  inject,
  OnInit
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatCardModule } from '@angular/material/card';
import { DeviceDetectorService } from 'ngx-device-detector';

@Component({
  imports: [GfPortfolioSummaryComponent, MatCardModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'gf-home-summary',
  styleUrls: ['./home-summary.scss'],
  templateUrl: './home-summary.html'
})
export class GfHomeSummaryComponent implements OnInit {
  protected deviceType: string;
  protected hasImpersonationId: boolean;
  protected hasPermissionToUpdateUserSettings: boolean;
  protected isLoading = true;
  protected summary: PortfolioSummary;
  protected user: User;

  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly dataService = inject(DataService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly deviceDetectorService = inject(DeviceDetectorService);
  private readonly impersonationStorageService = inject(
    ImpersonationStorageService
  );
  private readonly userService = inject(UserService);

  public constructor() {
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
    this.deviceType = this.deviceDetectorService.getDeviceInfo().deviceType;

    this.impersonationStorageService
      .onChangeHasImpersonation()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((impersonationId) => {
        this.hasImpersonationId = !!impersonationId;
      });
  }

  protected onChangeEmergencyFund(emergencyFund: number) {
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
        if (summary) {
          this.summary = summary;
        }

        this.isLoading = false;

        this.changeDetectorRef.markForCheck();
      });

    this.changeDetectorRef.markForCheck();
  }
}
