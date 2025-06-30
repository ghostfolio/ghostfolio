import { Component, OnDestroy } from '@angular/core';
import { MarkdownModule } from 'ngx-markdown';
import { Subject } from 'rxjs';

@Component({
  imports: [MarkdownModule],
  selector: 'gf-changelog-page',
  styleUrls: ['./changelog-page.scss'],
  templateUrl: './changelog-page.html'
})
export class ChangelogPageComponent implements OnDestroy {
  public isLoading = true;

  private unsubscribeSubject = new Subject<void>();

  public onLoad() {
    this.isLoading = false;
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
