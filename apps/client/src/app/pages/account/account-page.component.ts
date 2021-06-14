import {
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import {
  MatSlideToggle,
  MatSlideToggleChange
} from '@angular/material/slide-toggle';
import { DataService } from '@ghostfolio/client/services/data.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { WebAuthnService } from '@ghostfolio/client/services/web-authn.service';
import { DEFAULT_DATE_FORMAT } from '@ghostfolio/common/config';
import { Access, User } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { Currency } from '@prisma/client';
import { EMPTY, Subject } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'gf-account-page',
  templateUrl: './account-page.html',
  styleUrls: ['./account-page.scss']
})
export class AccountPageComponent implements OnDestroy, OnInit {
  @ViewChild('toggleSignInWithFingerprintEnabledElement')
  signInWithFingerprintElement: MatSlideToggle;

  public accesses: Access[];
  public baseCurrency: Currency;
  public currencies: Currency[] = [];
  public defaultDateFormat = DEFAULT_DATE_FORMAT;
  public hasPermissionToUpdateUserSettings: boolean;
  public user: User;

  private unsubscribeSubject = new Subject<void>();

  /**
   * @constructor
   */
  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private userService: UserService,
    public webAuthnService: WebAuthnService
  ) {
    this.dataService
      .fetchInfo()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(({ currencies }) => {
        this.currencies = currencies;
      });

    this.userService.stateChanged
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((state) => {
        if (state?.user) {
          this.user = state.user;

          this.hasPermissionToUpdateUserSettings = hasPermission(
            this.user.permissions,
            permissions.updateUserSettings
          );

          this.changeDetectorRef.markForCheck();
        }
      });
  }

  /**
   * Initializes the controller
   */
  public ngOnInit() {
    this.update();
  }

  public onChangeUserSettings(aKey: string, aValue: string) {
    const settings = { ...this.user.settings, [aKey]: aValue };

    this.dataService
      .putUserSettings({
        baseCurrency: settings?.baseCurrency,
        viewMode: settings?.viewMode
      })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(() => {
        this.userService.remove();

        this.userService
          .get()
          .pipe(takeUntil(this.unsubscribeSubject))
          .subscribe((user) => {
            this.user = user;

            this.changeDetectorRef.markForCheck();
          });
      });
  }

  public onSignInWithFingerprintChange(aEvent: MatSlideToggleChange) {
    if (aEvent.checked) {
      this.registerDevice();
    } else {
      const confirmation = confirm(
        'Do you really want to remove this sign in method?'
      );

      if (confirmation) {
        this.deregisterDevice();
      } else {
        this.update();
      }
    }
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  private deregisterDevice() {
    this.webAuthnService
      .deregister()
      .pipe(
        catchError(() => {
          this.update();

          return EMPTY;
        })
      )
      .subscribe(() => {
        this.update();
      });
  }

  private registerDevice() {
    this.webAuthnService
      .register()
      .pipe(
        catchError(() => {
          this.update();

          return EMPTY;
        })
      )
      .subscribe(() => {
        this.update();
      });
  }

  private update() {
    this.dataService
      .fetchAccesses()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((response) => {
        this.accesses = response;

        if (this.signInWithFingerprintElement) {
          this.signInWithFingerprintElement.checked =
            this.webAuthnService.isEnabled() ?? false;
        }

        this.changeDetectorRef.markForCheck();
      });
  }
}
