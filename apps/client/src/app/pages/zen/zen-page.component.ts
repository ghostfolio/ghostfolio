import { ViewportScroller } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { User } from '@ghostfolio/common/interfaces';
import { Subject } from 'rxjs';
import { first, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'gf-zen-page',
  templateUrl: './zen-page.html',
  styleUrls: ['./zen-page.scss']
})
export class ZenPageComponent implements AfterViewInit, OnDestroy, OnInit {
  public tabs: { iconName: string; path: string }[] = [];
  public user: User;

  private unsubscribeSubject = new Subject<void>();

  /**
   * @constructor
   */
  public constructor(
    private route: ActivatedRoute,
    private changeDetectorRef: ChangeDetectorRef,
    private userService: UserService,
    private viewportScroller: ViewportScroller
  ) {
    this.userService.stateChanged
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((state) => {
        if (state?.user) {
          this.tabs = [
            { iconName: 'analytics-outline', path: 'overview' },
            { iconName: 'wallet-outline', path: 'holdings' }
          ];
          this.user = state.user;

          this.changeDetectorRef.markForCheck();
        }
      });
  }

  public ngOnInit() {}

  public ngAfterViewInit(): void {
    this.route.fragment
      .pipe(first())
      .subscribe((fragment) => this.viewportScroller.scrollToAnchor(fragment));
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
