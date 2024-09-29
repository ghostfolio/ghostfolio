import { Directive, ElementRef } from '@angular/core';

@Directive({
  selector: '[gfCarouselItem]'
})
export class CarouselItemDirective {
  public constructor(readonly element: ElementRef<HTMLElement>) {}
}
