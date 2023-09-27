import { Component, OnDestroy, OnInit } from '@angular/core';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { User } from '@ghostfolio/common/interfaces';
import { Subject, takeUntil } from 'rxjs';

@Component({
  host: { class: 'page' },
  selector: 'gf-user-account-page',
  styleUrls: ['./user-account-page.scss'],
  templateUrl: './user-account-page.html'
})
export class UserAccountPageComponent implements OnDestroy, OnInit {
  public user: User;

  private unsubscribeSubject = new Subject<void>();

  public constructor(private userService: UserService) {
    this.userService.stateChanged
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((state) => {
        if (state?.user) {
          this.user = state.user;
        }
      });
  }

  public ngOnInit() {}

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
