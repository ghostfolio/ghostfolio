import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MarkdownModule } from 'ngx-markdown';

import { PrivacyPolicyPageRoutingModule } from './privacy-policy-page-routing.module';
import { PrivacyPolicyPageComponent } from './privacy-policy-page.component';

@NgModule({
  declarations: [PrivacyPolicyPageComponent],
  imports: [
    CommonModule,
    MarkdownModule.forChild(),
    PrivacyPolicyPageRoutingModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class PrivacyPolicyPageModule {}
