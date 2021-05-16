import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';
import { NavigationEnd, PRIMARY_OUTLET, Router } from '@angular/router';
import { primaryColorHex, secondaryColorHex } from '@ghostfolio/helper/config';
import { InfoItem, User } from '@ghostfolio/helper/interfaces';
import { hasPermission, permissions } from '@ghostfolio/helper/permissions';
import { MaterialCssVarsService } from 'angular-material-css-vars';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';

import { environment } from '../environments/environment';
import { DataService } from './services/data.service';
import { TokenStorageService } from './services/token-storage.service';

@Component({
  selector: 'gf-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnDestroy, OnInit {
  public canCreateAccount: boolean;
  public currentRoute: string;
  public currentYear = new Date().getFullYear();
  public info: InfoItem;
  public isLoggedIn = false;
  public user: User;
  public version = environment.version;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private cd: ChangeDetectorRef,
    private dataService: DataService,
    private materialCssVarsService: MaterialCssVarsService,
    private router: Router,
    private tokenStorageService: TokenStorageService
  ) {
    this.initializeTheme();
    this.user = undefined;
  }

  public ngOnInit() {
    this.dataService.fetchInfo().subscribe((info) => {
      this.info = info;
    });

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        const urlTree = this.router.parseUrl(this.router.url);
        const urlSegmentGroup = urlTree.root.children[PRIMARY_OUTLET];
        const urlSegments = urlSegmentGroup.segments;
        this.currentRoute = urlSegments[0].path;
      });

    this.tokenStorageService
      .onChangeHasToken()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(() => {
        this.isLoggedIn = !!this.tokenStorageService.getToken();

        if (this.isLoggedIn) {
          this.dataService.fetchUser().subscribe((user) => {
            this.user = user;

            this.canCreateAccount = hasPermission(
              this.user.permissions,
              permissions.createUserAccount
            );

            this.cd.markForCheck();
          });
        } else {
          this.user = null;
        }
      });
  }

  public onCreateAccount() {
    this.tokenStorageService.signOut();
    window.location.reload();
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  private initializeTheme() {
    this.materialCssVarsService.setDarkTheme(
      window.matchMedia('(prefers-color-scheme: dark)').matches
    );

    window.matchMedia('(prefers-color-scheme: dark)').addListener((event) => {
      this.materialCssVarsService.setDarkTheme(event.matches);
    });

    this.materialCssVarsService.setPrimaryColor(primaryColorHex);
    this.materialCssVarsService.setAccentColor(secondaryColorHex);
  }
}
