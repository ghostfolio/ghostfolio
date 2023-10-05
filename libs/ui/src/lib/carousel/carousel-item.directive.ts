import { FocusableOption } from "@angular/cdk/a11y";
import { ElementRef, HostBinding } from "@angular/core";


  export class CarouselItem implements FocusableOption {
    @HostBinding('attr.role') readonly role = 'listitem';
    @HostBinding('tabindex') tabindex = '-1';
  
    constructor(readonly element: ElementRef<HTMLElement>) {}
  
    focus(): void {
      this.element.nativeElement.focus({preventScroll: true});
    }
  }