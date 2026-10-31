import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { GfFlashOnChangeDirective } from './flash-on-change.directive';

@Component({
  imports: [GfFlashOnChangeDirective],
  template: `<tr [gfFlashOnChange]="value()"></tr>`
})
class TestHostComponent {
  public readonly value = signal<number | undefined>(100);
}

describe('GfFlashOnChangeDirective', () => {
  const setup = () => {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();

    return {
      fixture,
      classes: () => fixture.nativeElement.querySelector('tr').classList
    };
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [TestHostComponent] });
  });

  it('does not flash initially', () => {
    const { classes } = setup();

    expect(classes().contains('gf-flash-up')).toBe(false);
    expect(classes().contains('gf-flash-down')).toBe(false);
  });

  it('flashes up on an increase', () => {
    const { classes, fixture } = setup();

    fixture.componentInstance.value.set(101);
    fixture.detectChanges();

    expect(classes().contains('gf-flash-up')).toBe(true);
  });

  it('flashes down on a decrease', () => {
    const { classes, fixture } = setup();

    fixture.componentInstance.value.set(99);
    fixture.detectChanges();

    expect(classes().contains('gf-flash-down')).toBe(true);
  });

  it('does not flash if the value becomes undefined', () => {
    const { classes, fixture } = setup();

    fixture.componentInstance.value.set(undefined);
    fixture.detectChanges();

    expect(classes().contains('gf-flash-up')).toBe(false);
    expect(classes().contains('gf-flash-down')).toBe(false);
  });
});
