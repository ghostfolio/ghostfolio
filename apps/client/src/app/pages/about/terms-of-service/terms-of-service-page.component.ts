import { Component, OnDestroy } from '@angular/core';
import { MarkdownModule } from 'ngx-markdown';
import { Subject } from 'rxjs';

@Component({
  imports: [MarkdownModule],
  selector: 'gf-terms-of-service-page',
  styleUrls: ['./terms-of-service-page.scss'],
  templateUrl: './terms-of-service-page.html'
})
export class GfTermsOfServicePageComponent implements OnDestroy {
  private unsubscribeSubject = new Subject<void>();

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
