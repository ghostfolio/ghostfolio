import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatMenuModule } from '@angular/material/menu';
import { CacheService } from '@ghostfolio/client/services/cache.service';
import { GfValueModule } from '@ghostfolio/ui/value';

import { AdminPageRoutingModule } from './admin-page-routing.module';
import { AdminPageComponent } from './admin-page.component';

@NgModule({
  declarations: [AdminPageComponent],
  exports: [],
  imports: [
    AdminPageRoutingModule,
    CommonModule,
    GfValueModule,
    MatButtonModule,
    MatCardModule,
    MatMenuModule
  ],
  providers: [CacheService],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AdminPageModule {}
