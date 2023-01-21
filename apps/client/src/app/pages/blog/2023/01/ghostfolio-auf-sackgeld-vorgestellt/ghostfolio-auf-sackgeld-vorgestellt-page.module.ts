import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { GhostfolioAufSackgeldVorgestelltPageRoutingModule } from './ghostfolio-auf-sackgeld-vorgestellt-page-routing.module';
import { GhostfolioAufSackgeldVorgestelltPageComponent } from './ghostfolio-auf-sackgeld-vorgestellt-page.component';

@NgModule({
  declarations: [GhostfolioAufSackgeldVorgestelltPageComponent],
  imports: [
    CommonModule,
    GhostfolioAufSackgeldVorgestelltPageRoutingModule,
    RouterModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GhostfolioAufSackgeldVorgestelltPageModule {}
