import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatLegacyCardModule as MatCardModule } from '@angular/material/legacy-card';

import { BlogPageRoutingModule } from './blog-page-routing.module';
import { BlogPageComponent } from './blog-page.component';

@NgModule({
  declarations: [BlogPageComponent],
  imports: [BlogPageRoutingModule, CommonModule, MatCardModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class BlogPageModule {}
