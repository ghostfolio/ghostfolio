import { Component, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';

@Component({
  selector: 'gf-changelog-page',
  styleUrls: ['./changelog-page.scss'],
  templateUrl: './changelog-page.html'
})
export class ChangelogPageComponent implements OnDestroy {
  private unsubscribeSubject = new Subject<void>();

  public constructor() {}

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
