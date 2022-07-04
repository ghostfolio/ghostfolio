import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';

@Component({
  host: { class: 'page' },
  selector: 'gf-markets-page',
  styleUrls: ['./markets-page.scss'],
  templateUrl: './markets-page.html'
})
export class MarketsPageComponent implements OnDestroy, OnInit {
  private unsubscribeSubject = new Subject<void>();

  public constructor() {}

  public ngOnInit() {}

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
