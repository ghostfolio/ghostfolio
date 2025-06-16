import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MarkdownModule } from 'ngx-markdown';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

import { ChangelogPageRoutingModule } from './changelog-page-routing.module';
import { ChangelogPageComponent } from './changelog-page.component';

@NgModule({
  declarations: [ChangelogPageComponent],
  imports: [
    ChangelogPageRoutingModule,
    CommonModule,
    MarkdownModule.forChild(),
    NgxSkeletonLoaderModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ChangelogPageModule {}
