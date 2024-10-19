import { Component } from '@angular/core';
import { Subject } from 'rxjs';

@Component({
  host: { class: 'page' },
  selector: 'gf-i18n-page',
  standalone: true,
  styleUrls: ['./i18n-page.scss'],
  templateUrl: './i18n-page.html'
})
export class GfI18nPageComponent {
  private unsubscribeSubject = new Subject<void>();



  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
