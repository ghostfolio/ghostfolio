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

import { HttpClientMock } from './mocks/httpClient.mock';
import { GfSymbolAutocompleteComponent } from './symbol-autocomplete.component';

const FILTERED_OPTIONS: LookupItem[] = [
  {
    assetClass: 'COMMODITY',
    assetSubClass: 'ETF',
    currency: 'USD',
    dataProviderInfo: { name: 'YAHOO', isPremium: false },
    dataSource: null,
    name: 'Test3',
    symbol: 'TEST3'
  },
  {
    assetClass: 'EQUITY',
    assetSubClass: 'STOCK',
    currency: 'USD',
    dataProviderInfo: { name: 'YAHOO', isPremium: false },
    dataSource: null,
    name: 'Test4',
    symbol: 'TEST4'
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
          useValue: new HttpClientMock('/api/v1/symbol/lookup', {
            items: FILTERED_OPTIONS
          })
        }
      ]
    })
  ],
  parameters: {
    mockData: [
      {
        url: '/api/v1/symbol/lookup',
        method: 'GET',
        status: 200,
        response: {
          items: FILTERED_OPTIONS
        }
      }
    ]
  }
} as Meta<GfSymbolAutocompleteComponent>;

type Story = StoryObj<GfSymbolAutocompleteComponent>;

export const WithoutDefaults: Story = {
  args: {
    defaultLookupItems: []
  }
};

export const WithDefaults: Story = {
  args: {
    defaultLookupItems: [
      {
        assetClass: 'COMMODITY',
        assetSubClass: 'ETF',
        currency: 'USD',
        dataProviderInfo: { name: 'YAHOO', isPremium: false },
        dataSource: null,
        name: 'Test1',
        symbol: 'TEST1'
      },
      {
        assetClass: 'EQUITY',
        assetSubClass: 'STOCK',
        currency: 'USD',
        dataProviderInfo: { name: 'YAHOO', isPremium: false },
        dataSource: null,
        name: 'Test2',
        symbol: 'TEST2'
      }
    ]
  }
};
