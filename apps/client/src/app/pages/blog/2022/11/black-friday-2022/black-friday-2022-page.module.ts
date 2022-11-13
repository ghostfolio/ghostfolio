import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';
import { GfPremiumIndicatorModule } from '@ghostfolio/ui/premium-indicator';

import { BlackFriday2022RoutingModule } from './black-friday-2022-page-routing.module';
import { BlackFriday2022PageComponent } from './black-friday-2022-page.component';

@NgModule({
  declarations: [BlackFriday2022PageComponent],
  imports: [
    BlackFriday2022RoutingModule,
    CommonModule,
    GfPremiumIndicatorModule,
    MatButtonModule,
    RouterModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class BlackFriday2022PageModule {}
