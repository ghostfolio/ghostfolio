import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { Hacktoberfest2022RoutingModule } from './hacktoberfest-2022-page-routing.module';
import { Hacktoberfest2022PageComponent } from './hacktoberfest-2022-page.component';

@NgModule({
  declarations: [Hacktoberfest2022PageComponent],
  imports: [CommonModule, Hacktoberfest2022RoutingModule, RouterModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class Hacktoberfest2022PageModule {}
