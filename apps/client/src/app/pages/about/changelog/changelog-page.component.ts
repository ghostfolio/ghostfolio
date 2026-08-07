import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MarkdownModule } from 'ngx-markdown';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MarkdownModule, NgxSkeletonLoaderModule],
  selector: 'gf-changelog-page',
  styleUrls: ['./changelog-page.scss'],
  templateUrl: './changelog-page.html'
})
export class GfChangelogPageComponent {
  public isLoading = true;

  public onLoad() {
    this.isLoading = false;
  }
}
