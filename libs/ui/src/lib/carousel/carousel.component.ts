import {
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  Component,
  contentChildren,
  ElementRef,
  HostBinding,
  Inject,
  Input,
  Optional,
  ViewChild
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { ANIMATION_MODULE_TYPE } from '@angular/platform-browser/animations';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'gf-carousel',
  standalone: true,
  styleUrls: ['./carousel.component.scss'],
  templateUrl: './carousel.component.html'
})
export class GfCarouselComponent {
  public items = contentChildren('carouselItem', { read: ElementRef });

  @HostBinding('class.animations-disabled')
  public readonly animationsDisabled: boolean;

  @Input('aria-label') public ariaLabel: string | undefined;

  @ViewChild('list') public list!: ElementRef<HTMLElement>;

  public showPrevArrow = false;
  public showNextArrow = true;

  private index = 0;
  private position = 0;

  public constructor(
    @Optional() @Inject(ANIMATION_MODULE_TYPE) animationsModule?: string
  ) {
    this.animationsDisabled = animationsModule === 'NoopAnimations';
  }

  public next() {
    for (let i = this.index; i < this.items().length; i++) {
      if (this.isOutOfView(i)) {
        this.index = i;
        this.scrollToActiveItem();
        break;
      }
    }
  }

  public previous() {
    for (let i = this.index; i > -1; i--) {
      if (this.isOutOfView(i)) {
        this.index = i;
        this.scrollToActiveItem();
        break;
      }
    }
  }

  private isOutOfView(index: number, side?: 'start' | 'end') {
    const { offsetWidth, offsetLeft } = this.items()[index].nativeElement;

    if ((!side || side === 'start') && offsetLeft - this.position < 0) {
      return true;
    }

    return (
      (!side || side === 'end') &&
      offsetWidth + offsetLeft - this.position >
        this.list.nativeElement.clientWidth
    );
  }

  private scrollToActiveItem() {
    if (!this.isOutOfView(this.index)) {
      return;
    }

    let targetItemIndex = this.index;

    if (this.index > 0 && !this.isOutOfView(this.index - 1)) {
      targetItemIndex =
        this.items().findIndex((_, i) => !this.isOutOfView(i)) + 1;
    }

    this.position = this.items()[targetItemIndex].nativeElement.offsetLeft;
    this.list.nativeElement.style.transform = `translateX(-${this.position}px)`;
    this.showPrevArrow = this.index > 0;
    this.showNextArrow = false;

    for (let i = this.items().length - 1; i > -1; i--) {
      if (this.isOutOfView(i, 'end')) {
        this.showNextArrow = true;
        break;
      }
    }
  }
}
