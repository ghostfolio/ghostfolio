import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { GfLocalizedNumberDirective } from './localized-number.directive';

@Component({
  imports: [GfLocalizedNumberDirective, ReactiveFormsModule],
  template: `
    <input gfLocalizedNumber [formControl]="control" [locale]="locale" />
  `
})
class TestHostComponent {
  public control = new FormControl<number | null>(null);
  public locale = 'en-US';
}

describe('GfLocalizedNumberDirective', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;
  let input: HTMLInputElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
    input = fixture.nativeElement.querySelector('input');
  });

  function typeValue(value: string) {
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  it('should force type="text" and inputmode="decimal"', () => {
    expect(input.getAttribute('type')).toBe('text');
    expect(input.getAttribute('inputmode')).toBe('decimal');
  });

  it('should parse English grouped numbers', () => {
    host.locale = 'en-US';
    fixture.detectChanges();

    typeValue('1,234.50');
    expect(host.control.value).toBe(1234.5);

    typeValue('1234.50');
    expect(host.control.value).toBe(1234.5);
  });

  it('should parse German grouped numbers', () => {
    host.locale = 'de-DE';
    fixture.detectChanges();

    typeValue('1.234,50');
    expect(host.control.value).toBe(1234.5);

    typeValue('1234,50');
    expect(host.control.value).toBe(1234.5);

    typeValue('12.345.678,90');
    expect(host.control.value).toBe(12345678.9);
  });

  it('should set null for empty or invalid input', () => {
    typeValue('');
    expect(host.control.value).toBeNull();

    typeValue('   ');
    expect(host.control.value).toBeNull();

    typeValue('abc');
    expect(host.control.value).toBeNull();
  });

  it('should write programmatic values to the input', () => {
    host.control.setValue(1234.5);
    fixture.detectChanges();

    expect(input.value).toBe('1234.5');

    host.control.setValue(null);
    fixture.detectChanges();

    expect(input.value).toBe('');
  });

  it('should keep required validation working', () => {
    host.locale = 'de-DE';
    host.control.setValidators([
      (control) => {
        return control.value === null || control.value === undefined
          ? { required: true }
          : null;
      }
    ]);
    host.control.updateValueAndValidity();
    fixture.detectChanges();

    typeValue('');
    expect(host.control.hasError('required')).toBe(true);

    typeValue('1.234,50');
    expect(host.control.hasError('required')).toBe(false);
    expect(host.control.value).toBe(1234.5);
  });
});
