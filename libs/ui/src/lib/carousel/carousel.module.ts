import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

import { CarouselItem } from './carousel-item.directive';
import { CarouselComponent } from './carousel.component';

@NgModule({
  declarations: [CarouselComponent, CarouselItem],
  exports: [CarouselComponent, CarouselItem],
  imports: [CommonModule, MatButtonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfCarouselModule {}
