import { Component, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';

import { products } from './products';

@Component({
  host: { class: 'page' },
  selector: 'gf-alternatives-page',
  styleUrls: ['./alternatives-page.scss'],
  templateUrl: './alternatives-page.html'
})
export class AlternativesPageComponent implements OnDestroy {
  public products = products.filter(({ key }) => {
    return key !== 'ghostfolio';
  });

  private unsubscribeSubject = new Subject<void>();

  public constructor() {}

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
