import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MarkdownModule } from 'ngx-markdown';

import { ChangelogPageRoutingModule } from './changelog-page-routing.module';
import { ChangelogPageComponent } from './changelog-page.component';

@NgModule({
  declarations: [ChangelogPageComponent],
  imports: [
    ChangelogPageRoutingModule,
    CommonModule,
    MarkdownModule.forChild(),
    MatCardModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ChangelogPageModule {}
