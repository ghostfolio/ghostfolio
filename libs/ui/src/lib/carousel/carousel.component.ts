import { FocusKeyManager } from '@angular/cdk/a11y';
import { LEFT_ARROW, RIGHT_ARROW, TAB } from '@angular/cdk/keycodes';
import {
  AfterContentInit,
  ChangeDetectionStrategy,
  Component,
  ContentChildren,
  ElementRef,
  HostBinding,
  Inject,
  Input,
  Optional,
  QueryList,
  ViewChild
} from '@angular/core';
import { ANIMATION_MODULE_TYPE } from '@angular/platform-browser/animations';

import { CarouselItem } from './carousel-item.directive';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'gf-carousel',
  styleUrls: ['./carousel.component.scss'],
  templateUrl: './carousel.component.html'
})
export class CarouselComponent implements AfterContentInit {
  @ContentChildren(CarouselItem) public items!: QueryList<CarouselItem>;

  @HostBinding('class.animations-disabled')
  public readonly animationsDisabled: boolean;

  @Input('aria-label') public ariaLabel: string | undefined;

  @ViewChild('list') public list!: ElementRef<HTMLElement>;

  public showPrevArrow = false;
  public showNextArrow = true;

  private index = 0;
  private keyManager!: FocusKeyManager<CarouselItem>;
  private position = 0;

  public constructor(
    @Optional() @Inject(ANIMATION_MODULE_TYPE) animationsModule?: string
  ) {
    this.animationsDisabled = animationsModule === 'NoopAnimations';
  }

  public ngAfterContentInit() {
    this.keyManager = new FocusKeyManager<CarouselItem>(this.items);
  }

  public next() {
    for (let i = this.index; i < this.items.length; i++) {
      if (this.isOutOfView(i)) {
        this.index = i;
        this.scrollToActiveItem();
        break;
      }
    }
  }

  public onKeydown({ keyCode }: KeyboardEvent) {
    const manager = this.keyManager;
    const previousActiveIndex = manager.activeItemIndex;

    if (keyCode === LEFT_ARROW) {
      manager.setPreviousItemActive();
    } else if (keyCode === RIGHT_ARROW) {
      manager.setNextItemActive();
    } else if (keyCode === TAB && !manager.activeItem) {
      manager.setFirstItemActive();
    }

    if (
      manager.activeItemIndex != null &&
      manager.activeItemIndex !== previousActiveIndex
    ) {
      this.index = manager.activeItemIndex;
      this.updateItemTabIndices();

      if (this.isOutOfView(this.index)) {
        this.scrollToActiveItem();
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
    const { offsetWidth, offsetLeft } =
      this.items.toArray()[index].element.nativeElement;

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

    const itemsArray = this.items.toArray();
    let targetItemIndex = this.index;

    if (this.index > 0 && !this.isOutOfView(this.index - 1)) {
      targetItemIndex =
        itemsArray.findIndex((_, i) => !this.isOutOfView(i)) + 1;
    }

    this.position =
      itemsArray[targetItemIndex].element.nativeElement.offsetLeft;
    this.list.nativeElement.style.transform = `translateX(-${this.position}px)`;
    this.showPrevArrow = this.index > 0;
    this.showNextArrow = false;

    for (let i = itemsArray.length - 1; i > -1; i--) {
      if (this.isOutOfView(i, 'end')) {
        this.showNextArrow = true;
        break;
      }
    }
  }

  private updateItemTabIndices() {
    this.items.forEach((item: CarouselItem) => {
      if (this.keyManager != null) {
        item.tabindex = item === this.keyManager.activeItem ? '0' : '-1';
      }
    });
  }
}
