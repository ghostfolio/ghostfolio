import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { GhostfolioMeetsInternetIdentityRoutingModule } from './ghostfolio-meets-internet-identity-page-routing.module';
import { GhostfolioMeetsInternetIdentityPageComponent } from './ghostfolio-meets-internet-identity-page.component';

@NgModule({
  declarations: [GhostfolioMeetsInternetIdentityPageComponent],
  imports: [
    CommonModule,
    GhostfolioMeetsInternetIdentityRoutingModule,
    RouterModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GhostfolioMeetsInternetIdentityPageModule {}
