import { Component, OnDestroy } from '@angular/core';
import { MarkdownModule } from 'ngx-markdown';
import { Subject } from 'rxjs';

@Component({
  imports: [MarkdownModule],
  selector: 'gf-privacy-policy-page',
  styleUrls: ['./privacy-policy-page.scss'],
  templateUrl: './privacy-policy-page.html'
})
export class PrivacyPolicyPageComponent implements OnDestroy {
  private unsubscribeSubject = new Subject<void>();

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
