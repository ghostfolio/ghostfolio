import { AdminService, DataService } from '@ghostfolio/ui/services';

import { ChangeDetectorRef, DestroyRef } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import 'reflect-metadata';
import { of } from 'rxjs';

import { GfAssetProfileDialogComponent } from './asset-profile-dialog.component';

(globalThis as any).$localize = (
  strings: TemplateStringsArray,
  ...expressions: unknown[]
) => {
  return strings.reduce((result, string, index) => {
    return result + string + String(expressions[index] ?? '');
  }, '');
};

jest.mock('@ghostfolio/common/utils', () => {
  const actual = jest.requireActual('@ghostfolio/common/utils');

  return {
    ...actual,
    validateObjectForForm: jest.fn().mockResolvedValue(undefined)
  };
});

jest.mock('@ghostfolio/client/services/user/user.service', () => ({
  UserService: class {}
}));

jest.mock(
  '@ghostfolio/client/components/admin-market-data/admin-market-data.service',
  () => ({
    AdminMarketDataService: class {}
  })
);

jest.mock('@ionic/angular/standalone', () => ({
  IonIcon: class {}
}));

jest.mock('@ghostfolio/ui/currency-selector', () => ({
  GfCurrencySelectorComponent: class {}
}));

jest.mock('@ghostfolio/ui/entity-logo', () => ({
  GfEntityLogoComponent: class {}
}));

jest.mock('@ghostfolio/ui/historical-market-data-editor', () => ({
  GfHistoricalMarketDataEditorComponent: class {}
}));

jest.mock('@ghostfolio/ui/i18n', () => ({
  translate: (value: string) => value
}));

jest.mock('@ghostfolio/ui/line-chart', () => ({
  GfLineChartComponent: class {}
}));

jest.mock('@ghostfolio/ui/notifications', () => ({
  NotificationService: class {}
}));

jest.mock('@ghostfolio/ui/portfolio-proportion-chart', () => ({
  GfPortfolioProportionChartComponent: class {}
}));

jest.mock('@ghostfolio/ui/symbol-autocomplete', () => ({
  GfSymbolAutocompleteComponent: class {}
}));

jest.mock('@ghostfolio/ui/value', () => ({
  GfValueComponent: class {}
}));

describe('GfAssetProfileDialogComponent', () => {
  let component: GfAssetProfileDialogComponent;
  let adminService: jest.Mocked<AdminService>;
  let dataService: jest.Mocked<DataService>;

  beforeEach(() => {
    adminService = {
      patchAssetProfile: jest.fn().mockReturnValue(of(undefined))
    } as unknown as jest.Mocked<AdminService>;

    dataService = {
      deleteBenchmark: jest.fn().mockReturnValue(of(undefined)),
      postBenchmark: jest.fn().mockReturnValue(of(undefined)),
      updateInfo: jest.fn()
    } as unknown as jest.Mocked<DataService>;

    component = new GfAssetProfileDialogComponent(
      {} as never,
      adminService,
      { markForCheck: jest.fn() } as ChangeDetectorRef,
      { dataSource: 'YAHOO', symbol: 'AAPL' } as never,
      dataService,
      {} as DestroyRef,
      { close: jest.fn() } as MatDialogRef<GfAssetProfileDialogComponent>,
      new FormBuilder(),
      {} as never,
      { open: jest.fn() } as unknown as MatSnackBar,
      {} as never
    );

    component.assetProfile = {
      id: 'asset-profile-id',
      isActive: true
    } as never;
    component.benchmarks = [];

    component.assetProfileForm.patchValue({
      countries: '[]',
      currency: 'USD',
      isActive: true,
      name: 'Apple Inc.',
      scraperConfiguration: {
        defaultMarketPrice: null,
        headers: '{}',
        locale: '',
        mode: '',
        selector: '',
        url: ''
      },
      sectors: '[]',
      symbolMapping: '{}',
      url: ''
    });

    jest.spyOn(component, 'initialize').mockImplementation();
  });

  it('only updates the benchmark when the form is submitted', async () => {
    component.assetProfileForm.get('isBenchmark')?.setValue(true);

    expect(dataService.postBenchmark).not.toHaveBeenCalled();

    await component.onSubmitAssetProfileForm();

    expect(adminService.patchAssetProfile).toHaveBeenCalledTimes(1);
    expect(dataService.postBenchmark).toHaveBeenCalledWith({
      dataSource: 'YAHOO',
      symbol: 'AAPL'
    });
    expect(dataService.updateInfo).toHaveBeenCalledTimes(1);
  });

  it('removes the benchmark when it is unchecked and saved', async () => {
    component.benchmarks = [{ id: 'asset-profile-id' }];
    component.isBenchmark = true;
    component.assetProfileForm.get('isBenchmark')?.setValue(false);

    await component.onSubmitAssetProfileForm();

    expect(dataService.deleteBenchmark).toHaveBeenCalledWith({
      dataSource: 'YAHOO',
      symbol: 'AAPL'
    });
    expect(dataService.postBenchmark).not.toHaveBeenCalled();
  });

  it('does not call benchmark endpoints when the state is unchanged', async () => {
    component.assetProfileForm.get('isBenchmark')?.setValue(false);

    await component.onSubmitAssetProfileForm();

    expect(dataService.postBenchmark).not.toHaveBeenCalled();
    expect(dataService.deleteBenchmark).not.toHaveBeenCalled();
  });
});
