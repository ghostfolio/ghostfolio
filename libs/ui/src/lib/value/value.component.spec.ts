import { Clipboard } from '@angular/cdk/clipboard';
import { Component, Input } from '@angular/core';
import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  flush,
  tick
} from '@angular/core/testing';
import '@angular/localize/init';
import { MatSnackBar } from '@angular/material/snack-bar';
import { By } from '@angular/platform-browser';

import type { GfValueComponent as GfValueComponentType } from './value.component';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'ion-icon',
  standalone: true,
  template: ''
})
class MockIonIcon {
  @Input() name = '';
}

jest.mock('@ionic/angular/standalone', () => ({ IonIcon: MockIonIcon }));

const { GfValueComponent } =
  require('./value.component') as typeof import('./value.component');

describe('GfValueComponent', () => {
  let clipboard: { copy: jest.Mock };
  let fixture: ComponentFixture<GfValueComponentType>;
  let snackBar: { dismiss: jest.Mock; open: jest.Mock };

  const getCopyButton = () =>
    fixture.nativeElement.querySelector(
      'button[aria-label]'
    ) as HTMLButtonElement;

  const getCopyIcon = () =>
    fixture.debugElement.query(By.directive(MockIonIcon))
      .componentInstance as MockIonIcon;

  beforeEach(async () => {
    clipboard = { copy: jest.fn().mockReturnValue(true) };
    snackBar = { dismiss: jest.fn(), open: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [GfValueComponent],
      providers: [
        { provide: Clipboard, useValue: clipboard },
        { provide: MatSnackBar, useValue: snackBar }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(GfValueComponent);
    fixture.componentRef.setInput('enableCopyToClipboardButton', true);
    fixture.componentRef.setInput('locale', 'en-US');
    fixture.componentRef.setInput('value', 42);
    fixture.detectChanges();
  });

  it('shows confirmation immediately after copying', () => {
    getCopyButton().click();
    fixture.detectChanges();

    expect(clipboard.copy).toHaveBeenCalledWith('42');
    expect(snackBar.open).toHaveBeenCalledTimes(1);
    expect(snackBar.open).toHaveBeenCalledWith(
      expect.any(String),
      undefined,
      expect.objectContaining({ politeness: 'polite' })
    );
    expect(getCopyButton().title).toBe('Copied!');
    expect(getCopyIcon().name).toBe('checkmark-outline');
  });

  it('does not show confirmation when copying fails', () => {
    clipboard.copy.mockReturnValue(false);

    getCopyButton().click();
    fixture.detectChanges();

    expect(getCopyButton().title).toBe('Copy to clipboard');
    expect(getCopyIcon().name).toBe('copy-outline');
    expect(snackBar.dismiss).toHaveBeenCalledTimes(1);
    expect(snackBar.open).not.toHaveBeenCalled();
  });

  it('clears active confirmation when a repeated copy fails', fakeAsync(() => {
    getCopyButton().click();
    fixture.detectChanges();

    clipboard.copy.mockReturnValue(false);

    getCopyButton().click();
    fixture.detectChanges();

    expect(clipboard.copy).toHaveBeenCalledTimes(2);
    expect(snackBar.dismiss).toHaveBeenCalledTimes(1);
    expect(snackBar.open).toHaveBeenCalledTimes(1);
    expect(getCopyButton().title).toBe('Copy to clipboard');
    expect(getCopyIcon().name).toBe('copy-outline');

    tick(2000);

    expect(getCopyButton().title).toBe('Copy to clipboard');
    expect(getCopyIcon().name).toBe('copy-outline');
  }));

  it('keeps the copy action accessible during confirmation', () => {
    getCopyButton().click();
    fixture.detectChanges();

    expect(getCopyButton().getAttribute('aria-label')).toBe(
      'Copy to clipboard'
    );
    expect(getCopyButton().disabled).toBe(false);
    expect(snackBar.open).toHaveBeenCalledTimes(1);
  });

  it('restores the copy affordance after two seconds', fakeAsync(() => {
    getCopyButton().click();
    fixture.detectChanges();

    tick(1999);
    fixture.detectChanges();

    expect(getCopyButton().title).toBe('Copied!');
    expect(getCopyIcon().name).toBe('checkmark-outline');

    tick(1);
    fixture.detectChanges();

    expect(getCopyButton().title).toBe('Copy to clipboard');
    expect(getCopyIcon().name).toBe('copy-outline');
  }));

  it('restarts the confirmation timer when copied again', fakeAsync(() => {
    getCopyButton().click();
    tick(1999);

    getCopyButton().click();
    fixture.detectChanges();

    expect(clipboard.copy).toHaveBeenCalledTimes(2);
    expect(snackBar.open).toHaveBeenCalledTimes(2);

    tick(1);
    fixture.detectChanges();

    expect(getCopyButton().title).toBe('Copied!');
    expect(getCopyIcon().name).toBe('checkmark-outline');

    tick(1999);
    fixture.detectChanges();

    expect(getCopyButton().title).toBe('Copy to clipboard');
    expect(getCopyIcon().name).toBe('copy-outline');
  }));

  it('cancels the pending confirmation timer when destroyed', fakeAsync(() => {
    getCopyButton().click();

    fixture.destroy();

    expect(flush()).toBe(0);
  }));
});
