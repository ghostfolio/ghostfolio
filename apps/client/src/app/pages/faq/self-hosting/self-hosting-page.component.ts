import { Component, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';

@Component({
  host: { class: 'page' },
  selector: 'gf-self-hosting-page',
  styleUrls: ['./self-hosting-page.scss'],
  templateUrl: './self-hosting-page.html'
})
export class SelfHostingPageComponent implements OnDestroy {
  private unsubscribeSubject = new Subject<void>();

  public constructor() {}

  public ngOnInit() {}

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
