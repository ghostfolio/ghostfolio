import { Component } from '@angular/core';
import { MarkdownModule } from 'ngx-markdown';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

@Component({
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
