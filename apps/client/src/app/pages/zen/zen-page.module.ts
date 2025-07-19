import { HomeHoldingsComponent } from '@ghostfolio/client/components/home-holdings/home-holdings.component';
import { HomeOverviewComponent } from '@ghostfolio/client/components/home-overview/home-overview.component';

import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { RouterModule } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';

import { ZenPageRoutingModule } from './zen-page-routing.module';
import { ZenPageComponent } from './zen-page.component';

@NgModule({
  declarations: [ZenPageComponent],
  imports: [
    CommonModule,
    HomeHoldingsComponent,
    HomeOverviewComponent,
    IonIcon,
    MatTabsModule,
    RouterModule,
    ZenPageRoutingModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ZenPageModule {}
