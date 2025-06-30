import { Component, OnDestroy } from '@angular/core';
import { MarkdownModule } from 'ngx-markdown';
import { Subject } from 'rxjs';

@Component({
  imports: [MarkdownModule],
  selector: 'gf-license-page',
  styleUrls: ['./license-page.scss'],
  templateUrl: './license-page.html'
})
export class LicensePageComponent implements OnDestroy {
  private unsubscribeSubject = new Subject<void>();

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
