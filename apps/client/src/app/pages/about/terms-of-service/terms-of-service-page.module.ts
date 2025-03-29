import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MarkdownModule } from 'ngx-markdown';

import { TermsOfServicePageRoutingModule } from './terms-of-service-page-routing.module';
import { TermsOfServicePageComponent } from './terms-of-service-page.component';

@NgModule({
  declarations: [TermsOfServicePageComponent],
  imports: [
    CommonModule,
    MarkdownModule.forChild(),
    TermsOfServicePageRoutingModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class TermsOfServicePageModule {}
