import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

import { BlogPageRoutingModule } from './blog-page-routing.module';
import { BlogPageComponent } from './blog-page.component';

@NgModule({
  declarations: [BlogPageComponent],
  imports: [BlogPageRoutingModule, CommonModule, MatCardModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class BlogPageModule {}
