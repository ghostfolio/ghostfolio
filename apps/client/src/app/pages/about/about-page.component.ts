import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { DataService } from '@ghostfolio/client/services/data.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { baseCurrency } from '@ghostfolio/common/config';
import { User } from '@ghostfolio/common/interfaces';
import { Statistics } from '@ghostfolio/common/interfaces/statistics.interface';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { environment } from '../../../environments/environment';

@Component({
  selector: 'gf-about-page',
  templateUrl: './about-page.html',
  styleUrls: ['./about-page.scss']
})
export class AboutPageComponent implements OnDestroy, OnInit {
  public baseCurrency = baseCurrency;
  public hasPermissionForBlog: boolean;
  public hasPermissionForStatistics: boolean;
  public hasPermissionForSubscription: boolean;
  public isLoggedIn: boolean;
  public lastPublish = environment.lastPublish;
  public statistics: Statistics;
  public user: User;
  public version = environment.version;

  private unsubscribeSubject = new Subject<void>();

  /**
   * @constructor
   */
  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private userService: UserService
  ) {}

  /**
   * Initializes the controller
   */
  public ngOnInit() {
    const { globalPermissions, statistics } = this.dataService.fetchInfo();

    this.hasPermissionForBlog = hasPermission(
      globalPermissions,
      permissions.enableBlog
    );

    this.hasPermissionForStatistics = hasPermission(
      globalPermissions,
      permissions.enableStatistics
    );

    this.hasPermissionForSubscription = hasPermission(
      globalPermissions,
      permissions.enableSubscription
    );

    this.statistics = statistics;

    this.userService.stateChanged
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((state) => {
        if (state?.user) {
          this.user = state.user;

          this.changeDetectorRef.markForCheck();
        }
      });
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
