import { UserService } from '@ghostfolio/client/services/user/user.service';
import { User } from '@ghostfolio/common/interfaces';

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Subject, takeUntil } from 'rxjs';

import { GfGhostfolioPremiumApiDialogComponent } from './ghostfolio-premium-api-dialog/ghostfolio-premium-api-dialog.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'gf-admin-settings',
  styleUrls: ['./admin-settings.component.scss'],
  templateUrl: './admin-settings.component.html'
})
export class AdminSettingsComponent implements OnDestroy{
  public pricingUrl: string;

  private deviceType: string;
  private unsubscribeSubject = new Subject<void>();
  private user: User;

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private deviceService: DeviceDetectorService,
    private matDialog: MatDialog,
    private userService: UserService
  ) {}

  public ngOnInit() {
    this.deviceType = this.deviceService.getDeviceInfo().deviceType;

    this.userService.stateChanged
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((state) => {
        if (state?.user) {
          this.user = state.user;

          this.pricingUrl =
            `https://ghostfol.io/${this.user.settings.language}/` +
            $localize`:snake-case:pricing`;

          this.changeDetectorRef.markForCheck();
        }
      });
  }

  public onSetGhostfolioApiKey() {
    this.matDialog.open(GfGhostfolioPremiumApiDialogComponent, {
      autoFocus: false,
      data: {
        deviceType: this.deviceType,
        pricingUrl: this.pricingUrl
      },
      height: this.deviceType === 'mobile' ? '97.5vh' : undefined,
      width: this.deviceType === 'mobile' ? '100vw' : '50rem'
    });
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
