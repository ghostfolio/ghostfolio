import { Directive, ElementRef } from '@angular/core';

@Directive({
  selector: '[gf-carousel-item]'
})
export class CarouselItem {
  public constructor(readonly element: ElementRef<HTMLElement>) {}
}
