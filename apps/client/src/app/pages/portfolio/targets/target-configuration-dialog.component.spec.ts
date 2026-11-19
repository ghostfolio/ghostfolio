import { PortfolioTargetProfile, User } from '@ghostfolio/common/interfaces';
import { createDefaultPortfolioTarget } from '@ghostfolio/common/portfolio-targets/portfolio-targets-presets';
import { AssetClass } from '@ghostfolio/prisma/enums';

import { TestBed } from '@angular/core/testing';
import '@angular/localize/init';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { GfTargetConfigurationDialogComponent } from './target-configuration-dialog.component';
import {
  createTargetFromPreset,
  getTargetProfileName,
  TARGET_PRESETS
} from './target-presets';

jest.mock('@ghostfolio/ui/i18n', () => ({
  translate: (value: string) => value
}));
jest.mock('@ghostfolio/ui/portfolio-proportion-chart', () => ({
  GfPortfolioProportionChartComponent: class {}
}));

describe('Portfolio target configuration dialog', () => {
  const close = jest.fn();
  function create(profile?: PortfolioTargetProfile) {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: MAT_DIALOG_DATA,
          useValue: { profile, user: { settings: {} } as User }
        },
        { provide: MatDialogRef, useValue: { close } }
      ]
    });
    return TestBed.runInInjectionContext(
      () => new GfTargetConfigurationDialogComponent()
    );
  }
  afterEach(() => {
    TestBed.resetTestingModule();
    close.mockClear();
  });

  it('starts with a valid moderate target for existing users without settings', () => {
    const component = create();
    expect(component['profile'].presetId).toBe('moderate-60-40');
    expect(component['isValid']).toBe(true);
  });

  it('edits a copy and cancels without modifying persisted targets', () => {
    const profile = createDefaultPortfolioTarget();
    const component = create(profile);
    component['updateAllocation'](AssetClass.EQUITY, 50);
    component['cancel']();
    expect(profile.allocations.EQUITY).toBe(0.6);
    expect(close).toHaveBeenCalledWith();
  });

  it('does not convert blank fields into valid zero allocations or tolerances', () => {
    const component = create();
    component['updateTolerance'](null);
    expect(component['isValid']).toBe(false);
    component['updateTolerance'](5);
    component['updateAllocation'](AssetClass.COMMODITY, null);
    expect(component['isValid']).toBe(false);
    component['save']();
    expect(close).not.toHaveBeenCalled();
  });

  it('keeps tolerance when selecting a preset and invalidates the preset label on editing', () => {
    const component = create();
    component['updateTolerance'](7);
    component['applyPreset']('golden-butterfly');
    expect(component['profile'].tolerance).toBe(0.07);
    expect(component['profile'].name).toBe('Golden Butterfly (simplified)');
    component['updateAllocation'](AssetClass.EQUITY, 35);
    expect(component['profile'].presetId).toBeUndefined();
    expect(component['profile'].name).toBe('Custom');
    expect(component['chartData'][AssetClass.EQUITY].value).toBe(0.35);
    expect(component['isValid']).toBe(false);
  });

  it('saves a valid profile and uses the same client label for each preset', () => {
    const component = create();
    component['save']();
    expect(close).toHaveBeenCalledWith(component['profile']);
    for (const { id, label } of TARGET_PRESETS) {
      expect(getTargetProfileName(createTargetFromPreset(id))).toBe(label);
      const modified = createTargetFromPreset(id);
      modified.allocations.EQUITY = 0;
      expect(createTargetFromPreset(id).allocations.EQUITY).toBeGreaterThan(0);
    }
  });
  it('resolves a stored preset in the active UI language without rewriting its name', () => {
    const stored = createTargetFromPreset('moderate-60-40');
    const label = TARGET_PRESETS[2];
    const originalLabel = label.label;
    try {
      label.label = 'Moderato (60/40)';
      expect(getTargetProfileName(stored)).toBe('Moderato (60/40)');
      expect(stored.name).toBe('Moderate (60/40)');
    } finally {
      label.label = originalLabel;
    }
  });

  it('preserves a personal profile name while localizing generated labels', () => {
    const stored = {
      ...createDefaultPortfolioTarget(),
      presetId: undefined,
      name: 'Piano famiglia'
    };
    expect(getTargetProfileName(stored)).toBe('Piano famiglia');
    expect(getTargetProfileName({ ...stored, name: 'Custom' })).toBe('Custom');
  });
});
