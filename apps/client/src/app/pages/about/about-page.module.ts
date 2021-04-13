import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MarkdownModule } from 'ngx-markdown';

import { AboutPageRoutingModule } from './about-page-routing.module';
import { AboutPageComponent } from './about-page.component';

@NgModule({
  declarations: [AboutPageComponent],
  exports: [],
  imports: [
    AboutPageRoutingModule,
    CommonModule,
    MarkdownModule.forChild(),
    MatButtonModule,
    MatCardModule
  ],
  providers: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AboutPageModule {}
