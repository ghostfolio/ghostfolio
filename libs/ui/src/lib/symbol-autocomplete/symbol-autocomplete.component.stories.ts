import { LookupItem } from '@ghostfolio/common/interfaces';

import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import {
  FormControl,
  FormsModule,
  NgControl,
  ReactiveFormsModule
} from '@angular/forms';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { applicationConfig, Meta, StoryObj } from '@storybook/angular';

import { HttpClientMock } from '../mocks/httpClient.mock';
import { GfSymbolAutocompleteComponent } from './symbol-autocomplete.component';

const DEFAULT_OPTIONS: LookupItem[] = [
  {
    assetClass: 'COMMODITY',
    assetSubClass: 'ETF',
    currency: 'USD',
    dataProviderInfo: { name: 'YAHOO', isPremium: false },
    dataSource: null,
    name: 'Default1',
    symbol: 'DEFAULT1'
  },
  {
    assetClass: 'EQUITY',
    assetSubClass: 'STOCK',
    currency: 'USD',
    dataProviderInfo: { name: 'YAHOO', isPremium: false },
    dataSource: null,
    name: 'Default2',
    symbol: 'DEFAULT2'
  }
];
const FILTERED_OPTIONS: LookupItem[] = [
  {
    assetClass: 'COMMODITY',
    assetSubClass: 'ETF',
    currency: 'USD',
    dataProviderInfo: { name: 'YAHOO', isPremium: false },
    dataSource: null,
    name: 'Autocomplete1',
    symbol: 'AUTOCOMPLETE1'
  },
  {
    assetClass: 'EQUITY',
    assetSubClass: 'STOCK',
    currency: 'USD',
    dataProviderInfo: { name: 'YAHOO', isPremium: false },
    dataSource: null,
    name: 'Autocomplete2',
    symbol: 'AUTOCOMPLETE2'
  }
];

export default {
  title: 'Symbol Autocomplete',
  component: GfSymbolAutocompleteComponent,
  decorators: [
    applicationConfig({
      providers: [
        provideNoopAnimations(),
        importProvidersFrom(CommonModule, FormsModule, ReactiveFormsModule),
        {
          provide: NgControl,
          useValue: {
            control: new FormControl(),
            valueAccessor: null
          }
        },
        {
          provide: HttpClient,
          useValue: new HttpClientMock(
            new Map([
              [
                '/api/v1/symbol/lookup',
                {
                  items: FILTERED_OPTIONS
                }
              ]
            ])
          )
        }
      ]
    })
  ]
} as Meta<GfSymbolAutocompleteComponent>;

type Story = StoryObj<GfSymbolAutocompleteComponent>;

export const WithoutDefaults: Story = {
  args: {
    defaultLookupItems: []
  }
};

export const WithDefaults: Story = {
  args: {
    defaultLookupItems: DEFAULT_OPTIONS
  }
};
