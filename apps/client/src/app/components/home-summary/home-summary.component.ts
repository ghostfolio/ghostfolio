import { GfPortfolioSummaryComponent } from '@ghostfolio/client/components/portfolio-summary/portfolio-summary.component';
import { ImpersonationStorageService } from '@ghostfolio/client/services/impersonation-storage.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { PortfolioSummary, User } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { DataService } from '@ghostfolio/ui/services';

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  DestroyRef,
  inject,
  OnInit,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatCardModule } from '@angular/material/card';
import { DeviceDetectorService } from 'ngx-device-detector';
import { switchMap } from 'rxjs';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GfPortfolioSummaryComponent, MatCardModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'gf-home-summary',
  styleUrls: ['./home-summary.scss'],
  templateUrl: './home-summary.html'
})
export class GfHomeSummaryComponent implements OnInit {
  protected readonly hasImpersonationId = signal<boolean>(false);
  protected readonly isLoading = signal(true);
  protected readonly summary = signal<PortfolioSummary | undefined>(undefined);
  protected readonly user = signal<User | undefined>(undefined);

  protected readonly deviceType = computed(
    () => this.deviceDetectorService.deviceInfo().deviceType
  );

  protected readonly hasPermissionToUpdateUserSettings = computed(() => {
    const user = this.user();

    return user
      ? hasPermission(user.permissions, permissions.updateUserSettings)
      : false;
  });

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
          this.user.set(state.user);
          this.update();
        }
      });
  }

  public ngOnInit() {
    this.impersonationStorageService
      .onChangeHasImpersonation()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((impersonationId) => {
        this.hasImpersonationId.set(!!impersonationId);
      });
  }

  protected onChangeEmergencyFund(emergencyFund: number) {
    this.dataService
      .putUserSetting({ emergencyFund })
      .pipe(
        switchMap(() => this.userService.get(true)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((user) => {
        this.user.set(user);
      });
  }

  private update() {
    this.isLoading.set(true);

    this.dataService
      .fetchPortfolioDetails()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ summary }) => {
        if (summary) {
          this.summary.set(summary);
        }

        this.isLoading.set(false);
      });
  }
}
