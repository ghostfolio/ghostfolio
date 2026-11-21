import { Filter, PortfolioPosition } from '@ghostfolio/common/interfaces';
import { DataService } from '@ghostfolio/ui/services';

import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import '@angular/localize/init';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatSelectHarness } from '@angular/material/select/testing';
import { provideRouter } from '@angular/router';
import { AssetClass, AssetSubClass, DataSource } from '@prisma/client';
import { of } from 'rxjs';

import { GfAssistantComponent } from './assistant.component';

jest.mock('@ionic/angular/standalone', () => {
  const { Component } =
    jest.requireActual<typeof import('@angular/core')>('@angular/core');

  return {
    IonIcon: Component({
      selector: 'ion-icon',
      template: '',
      inputs: ['name']
    })(class {})
  };
});

describe('GfAssistantComponent holding filters', () => {
  let fixture: ComponentFixture<GfAssistantComponent>;
  let loader: HarnessLoader;
  let holdings: PortfolioPosition[];
  let filtersChanged: jest.Mock;

  beforeEach(async () => {
    holdings = [
      {
        name: 'Active holding',
        quantity: 1,
        assetSubClass: AssetSubClass.STOCK
      },
      {
        name: 'Closed holding',
        quantity: 0,
        assetSubClass: AssetSubClass.STOCK
      },
      { name: 'Cash holding', quantity: 1, assetSubClass: AssetSubClass.CASH }
    ].map(({ name, quantity, assetSubClass }) => {
      return {
        assetProfile: {
          assetClass: AssetClass.EQUITY,
          assetSubClass,
          currency: 'USD',
          dataSource: DataSource.MANUAL,
          name,
          symbol: name
        },
        quantity
      } as PortfolioPosition;
    });

    await TestBed.configureTestingModule({
      imports: [GfAssistantComponent],
      providers: [
        provideRouter([]),
        {
          provide: DataService,
          useValue: {
            fetchPortfolioHoldings: ({
              filters = []
            }: { filters?: Filter[] } = {}) => {
              const activeOnly = filters.some(({ id, type }) => {
                return type === 'HOLDING_TYPE' && id === 'ACTIVE';
              });

              return of({
                holdings: holdings.filter(({ quantity }) => {
                  return !activeOnly || quantity > 0;
                })
              });
            }
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(GfAssistantComponent);
    fixture.componentRef.setInput('hasPermissionToChangeFilters', true);
    fixture.componentRef.setInput('user', {
      accounts: [],
      settings: {},
      tags: []
    });
    filtersChanged = jest.fn();
    fixture.componentRef.instance['filtersChanged'].subscribe(filtersChanged);
    fixture.autoDetectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
    await fixture.whenStable();
  });

  it('should offer active and closed holdings while excluding cash', async () => {
    fixture.componentInstance.initialize();
    const holdingSelect = await loader.getHarness(
      MatSelectHarness.with({ selector: '[formControlName="holding"]' })
    );
    await holdingSelect.open();

    expect(
      await Promise.all(
        (await holdingSelect.getOptions()).map((option) => option.getText())
      )
    ).toEqual([
      '',
      expect.stringMatching(/^Active holding/),
      expect.stringMatching(/^Closed holding/)
    ]);

    await holdingSelect.clickOptions({ text: /Closed holding/ });
    const applyButton = await loader.getHarness(
      MatButtonHarness.with({ text: 'Apply Filters' })
    );
    await applyButton.click();

    expect(filtersChanged).toHaveBeenCalledWith([
      { id: '', type: 'ACCOUNT' },
      { id: '', type: 'ASSET_CLASS' },
      { id: DataSource.MANUAL, type: 'DATA_SOURCE' },
      { id: 'Closed holding', type: 'SYMBOL' },
      { id: '', type: 'TAG' }
    ]);
  });

  it('should retain a selected holding after it closes and allow resetting its filters', async () => {
    fixture.componentRef.setInput('user', {
      accounts: [],
      settings: {
        'filters.dataSource': DataSource.MANUAL,
        'filters.symbol': 'Active holding'
      },
      tags: []
    });
    await fixture.whenStable();
    fixture.componentInstance.initialize();
    const holdingSelect = await loader.getHarness(
      MatSelectHarness.with({ selector: '[formControlName="holding"]' })
    );
    expect(await holdingSelect.getValueText()).toBe('Active holding');
    fixture.componentInstance.onCloseAssistant();

    holdings[0].quantity = 0;
    fixture.componentInstance.initialize();

    expect(await holdingSelect.getValueText()).toBe('Active holding');
    const resetButton = await loader.getHarness(
      MatButtonHarness.with({ text: 'Reset Filters' })
    );
    expect(await resetButton.isDisabled()).toBe(false);
    await resetButton.click();

    expect(filtersChanged).toHaveBeenCalledWith([
      { type: 'ACCOUNT', id: '' },
      { type: 'ASSET_CLASS', id: '' },
      { type: 'DATA_SOURCE', id: '' },
      { type: 'SYMBOL', id: '' },
      { type: 'TAG', id: '' }
    ]);
    expect(fixture.componentInstance.isOpen).toBe(false);
  });

  it('should keep Reset Filters disabled when no filter is selected', async () => {
    fixture.componentInstance.initialize();
    const resetButton = await loader.getHarness(
      MatButtonHarness.with({ text: 'Reset Filters' })
    );

    expect(await resetButton.isDisabled()).toBe(true);
  });

  it('should keep filters disabled without permission to change them', async () => {
    fixture.componentRef.setInput('hasPermissionToChangeFilters', false);
    fixture.componentRef.setInput('user', {
      accounts: [],
      settings: {
        'filters.dataSource': DataSource.MANUAL,
        'filters.symbol': 'Closed holding'
      },
      tags: []
    });
    await fixture.whenStable();
    fixture.componentInstance.initialize();
    const holdingSelect = await loader.getHarness(
      MatSelectHarness.with({ selector: '[formControlName="holding"]' })
    );
    const resetButton = await loader.getHarness(
      MatButtonHarness.with({ text: 'Reset Filters' })
    );

    expect(await holdingSelect.isDisabled()).toBe(true);
    expect(await resetButton.isDisabled()).toBe(true);
  });
});
