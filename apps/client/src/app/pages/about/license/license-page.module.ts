import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MarkdownModule } from 'ngx-markdown';

import { LicensePageRoutingModule } from './license-page-routing.module';
import { LicensePageComponent } from './license-page.component';

@NgModule({
  declarations: [LicensePageComponent],
  imports: [LicensePageRoutingModule, CommonModule, MarkdownModule.forChild()],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class LicensePageModule {}
