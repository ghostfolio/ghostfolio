import { Component, OnDestroy } from '@angular/core';
import { MarkdownModule } from 'ngx-markdown';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { Subject } from 'rxjs';

@Component({
  imports: [MarkdownModule, NgxSkeletonLoaderModule],
  selector: 'gf-changelog-page',
  styleUrls: ['./changelog-page.scss'],
  templateUrl: './changelog-page.html'
})
export class GfChangelogPageComponent implements OnDestroy {
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
