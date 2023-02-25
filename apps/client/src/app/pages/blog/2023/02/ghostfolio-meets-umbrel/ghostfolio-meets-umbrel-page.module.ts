import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { GhostfolioMeetsUmbrelPageRoutingModule } from './ghostfolio-meets-umbrel-page-routing.module';
import { GhostfolioMeetsUmbrelPageComponent } from './ghostfolio-meets-umbrel-page.component';

@NgModule({
  declarations: [GhostfolioMeetsUmbrelPageComponent],
  imports: [CommonModule, GhostfolioMeetsUmbrelPageRoutingModule, RouterModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GhostfolioMeetsUmbrelPageModule {}
