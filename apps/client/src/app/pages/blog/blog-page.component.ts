import { Component, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';

@Component({
  host: { class: 'page' },
  selector: 'gf-blog-page',
  styleUrls: ['./blog-page.scss'],
  templateUrl: './blog-page.html'
})
export class BlogPageComponent implements OnDestroy {
  private unsubscribeSubject = new Subject<void>();

  /**
   * @constructor
   */
  public constructor() {}

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
