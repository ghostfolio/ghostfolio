import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';

import { CacheService } from '../../services/cache.service';
import { AdminPageRoutingModule } from './admin-page-routing.module';
import { AdminPageComponent } from './admin-page.component';

@NgModule({
  declarations: [AdminPageComponent],
  exports: [],
  imports: [
    AdminPageRoutingModule,
    CommonModule,
    MatButtonModule,
    MatCardModule
  ],
  providers: [CacheService],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AdminPageModule {}
