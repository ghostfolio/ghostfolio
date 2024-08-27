import { FocusableOption } from '@angular/cdk/a11y';
import { Directive, ElementRef, HostBinding } from '@angular/core';

@Directive({
  selector: '[gf-carousel-item]'
})
export class CarouselItem implements FocusableOption {
  @HostBinding('attr.role') readonly role = 'listitem';
  @HostBinding('tabindex') tabindex = '-1';

  public constructor(readonly element: ElementRef<HTMLElement>) {}

  public focus() {
    this.element.nativeElement.focus({ preventScroll: true });
  }
}
