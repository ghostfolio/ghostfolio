import {
  ChangeDetectorRef,
  Component,
  HostBinding,
  OnDestroy,
  OnInit
} from '@angular/core';
import { DataService } from '@ghostfolio/client/services/data.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { InfoItem, User } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'gf-portfolio-page',
  styleUrls: ['./portfolio-page.scss'],
  templateUrl: './portfolio-page.html'
})
export class PortfolioPageComponent implements OnDestroy, OnInit {
  @HostBinding('class.with-info-message') get getHasMessage() {
    return this.hasMessage;
  }

  public hasMessage: boolean;
  public info: InfoItem;
  public tabs: { iconName: string; path: string }[] = [];
  public user: User;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private userService: UserService
  ) {
    this.info = this.dataService.fetchInfo();

    this.userService.stateChanged
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((state) => {
        if (state?.user) {
          this.tabs = [
            { iconName: 'analytics-outline', path: 'analysis' },
            { iconName: 'wallet-outline', path: 'holdings' },
            { iconName: 'swap-vertical-outline', path: 'activities' },
            { iconName: 'pie-chart-outline', path: 'allocations' },
            { iconName: 'calculator-outline', path: 'fire' }
          ];
          this.user = state.user;

          this.hasMessage =
            hasPermission(
              this.user?.permissions,
              permissions.createUserAccount
            ) || !!this.info.systemMessage;

          this.changeDetectorRef.markForCheck();
        }
      });
  }

  public ngOnInit() {}

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
