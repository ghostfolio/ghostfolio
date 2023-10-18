import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';

import { I18nPageRoutingModule } from './i18n-page-routing.module';
import { I18nPageComponent } from './i18n-page.component';

@NgModule({
  declarations: [I18nPageComponent],
  imports: [CommonModule, I18nPageRoutingModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class I18nPageModule {}
