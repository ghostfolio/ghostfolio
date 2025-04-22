import { GfBenchmarkComponent } from '@ghostfolio/ui/benchmark';

import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';

import { HomeWatchlistComponent } from './home-watchlist.component';

@NgModule({
  declarations: [HomeWatchlistComponent],
  exports: [HomeWatchlistComponent],
  imports: [CommonModule, GfBenchmarkComponent, MatButtonModule, RouterModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfHomeWatchlistModule {}
