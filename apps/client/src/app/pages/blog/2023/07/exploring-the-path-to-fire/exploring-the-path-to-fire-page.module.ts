import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';

import { ExploringThePathToFireRoutingModule } from './exploring-the-path-to-fire-page-routing.module';
import { ExploringThePathToFirePageComponent } from './exploring-the-path-to-fire-page.component';

@NgModule({
  declarations: [ExploringThePathToFirePageComponent],
  imports: [
    CommonModule,
    ExploringThePathToFireRoutingModule,
    MatButtonModule,
    RouterModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ExploringThePathToFirePageModule {}
