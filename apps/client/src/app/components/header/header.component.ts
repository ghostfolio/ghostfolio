import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  Output,
  ViewChild
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatMenuTrigger } from '@angular/material/menu';
import { Router } from '@angular/router';
import { LoginWithAccessTokenDialog } from '@ghostfolio/client/components/login-with-access-token-dialog/login-with-access-token-dialog.component';
import { DataService } from '@ghostfolio/client/services/data.service';
import { ImpersonationStorageService } from '@ghostfolio/client/services/impersonation-storage.service';
import {
  KEY_STAY_SIGNED_IN,
  SettingsStorageService
} from '@ghostfolio/client/services/settings-storage.service';
import { TokenStorageService } from '@ghostfolio/client/services/token-storage.service';
import { InfoItem, User } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { AssistantComponent } from '@ghostfolio/ui/assistant/assistant.component';
import { EMPTY, Subject } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'gf-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnChanges {
  @HostListener('window:keydown', ['$event'])
  openAssistantWithHotKey(event: KeyboardEvent) {
    if (
      event.key === '/' &&
      event.target instanceof Element &&
      event.target?.nodeName?.toLowerCase() !== 'input' &&
      event.target?.nodeName?.toLowerCase() !== 'textarea' &&
      this.hasPermissionToAccessAssistant
    ) {
      this.assistantElement.setIsOpen(true);
      this.assistentMenuTriggerElement.openMenu();

      event.preventDefault();
    }
  }

  @Input() currentRoute: string;
  @Input() deviceType: string;
  @Input() hasTabs: boolean;
  @Input() info: InfoItem;
  @Input() pageTitle: string;
  @Input() user: User;

  @Output() signOut = new EventEmitter<void>();

  @ViewChild('assistant') assistantElement: AssistantComponent;
  @ViewChild('assistantTrigger') assistentMenuTriggerElement: MatMenuTrigger;

  public hasPermissionForSocialLogin: boolean;
  public hasPermissionForSubscription: boolean;
  public hasPermissionToAccessAdminControl: boolean;
  public hasPermissionToAccessAssistant: boolean;
  public hasPermissionToAccessFearAndGreedIndex: boolean;
  public hasPermissionToCreateUser: boolean;
  public impersonationId: string;
  public isMenuOpen: boolean;
  public routeAbout = $localize`about`;
  public routeFeatures = $localize`features`;
  public routeMarkets = $localize`markets`;
  public routePricing = $localize`pricing`;
  public routeResources = $localize`resources`;
  public routerLinkAbout = ['/' + $localize`about`];
  public routerLinkFeatures = ['/' + $localize`features`];
  public routerLinkMarkets = ['/' + $localize`markets`];
  public routerLinkPricing = ['/' + $localize`pricing`];
  public routerLinkRegister = ['/' + $localize`register`];
  public routerLinkResources = ['/' + $localize`resources`];

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private dataService: DataService,
    private dialog: MatDialog,
    private impersonationStorageService: ImpersonationStorageService,
    private router: Router,
    private settingsStorageService: SettingsStorageService,
    private tokenStorageService: TokenStorageService
  ) {
    this.impersonationStorageService
      .onChangeHasImpersonation()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((impersonationId) => {
        this.impersonationId = impersonationId;
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

    this.hasPermissionToAccessAssistant = hasPermission(
      this.user?.permissions,
      permissions.accessAssistant
    );

    this.hasPermissionToAccessFearAndGreedIndex = hasPermission(
      this.info?.globalPermissions,
      permissions.enableFearAndGreedIndex
    );

    this.hasPermissionToCreateUser = hasPermission(
      this.info?.globalPermissions,
      permissions.createUserAccount
    );
  }

  public closeAssistant() {
    this.assistentMenuTriggerElement?.closeMenu();
  }

  public impersonateAccount(aId: string) {
    if (aId) {
      this.impersonationStorageService.setId(aId);
    } else {
      this.impersonationStorageService.removeId();
    }

    window.location.reload();
  }

  public onMenuClosed() {
    this.isMenuOpen = false;
  }

  public onMenuOpened() {
    this.isMenuOpen = true;
  }

  public onOpenAssistant() {
    this.assistantElement.initialize();
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
        title: $localize`Sign in`
      },
      width: '30rem'
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((data) => {
        if (data?.accessToken) {
          this.dataService
            .loginAnonymous(data?.accessToken)
            .pipe(
              catchError(() => {
                alert($localize`Oops! Incorrect Security Token.`);

                return EMPTY;
              }),
              takeUntil(this.unsubscribeSubject)
            )
            .subscribe(({ authToken }) => {
              this.setToken(authToken);
            });
        }
      });
  }

  public setToken(aToken: string) {
    this.tokenStorageService.saveToken(
      aToken,
      this.settingsStorageService.getSetting(KEY_STAY_SIGNED_IN) === 'true'
    );

    this.router.navigate(['/']);
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
