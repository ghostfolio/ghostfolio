import { Component, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';

@Component({
  host: { class: 'page' },
  selector: 'gf-markets-page',
  styleUrls: ['./markets-page.scss'],
  templateUrl: './markets-page.html'
})
export class MarketsPageComponent implements OnDestroy {
  private unsubscribeSubject = new Subject<void>();

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
