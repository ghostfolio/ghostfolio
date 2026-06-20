import { DataService } from '@ghostfolio/ui/services';

import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DeviceDetectorService } from 'ngx-device-detector';

import { GfHistoricalMarketDataEditorComponent } from './historical-market-data-editor.component';

jest.mock(
  './historical-market-data-editor-dialog/historical-market-data-editor-dialog.component',
  () => ({
    GfHistoricalMarketDataEditorDialogComponent: class {}
  })
);

describe('GfHistoricalMarketDataEditorComponent', () => {
  let component: GfHistoricalMarketDataEditorComponent;
  let fixture: ComponentFixture<GfHistoricalMarketDataEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GfHistoricalMarketDataEditorComponent],
      providers: [
        FormBuilder,
        { provide: DataService, useValue: {} },
        {
          provide: DeviceDetectorService,
          useValue: {
            deviceInfo: signal({ deviceType: 'desktop' })
          }
        },
        { provide: MatDialog, useValue: {} },
        { provide: MatSnackBar, useValue: {} }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(GfHistoricalMarketDataEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('formatDay', () => {
    it('should pad single digit days with zero', () => {
      expect(component.formatDay(1)).toBe('01');
      expect(component.formatDay(9)).toBe('09');
    });

    it('should not pad double digit days', () => {
      expect(component.formatDay(10)).toBe('10');
      expect(component.formatDay(31)).toBe('31');
    });
  });
});
