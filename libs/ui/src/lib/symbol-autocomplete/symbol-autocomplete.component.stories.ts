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
    assetClass: 'EQUITY',
    assetSubClass: 'ETF',
    currency: 'USD',
    dataProviderInfo: {
      dataSource: 'YAHOO',
      isPremium: false
    },
    dataSource: null,
    name: 'Default 1',
    symbol: 'D1'
  },
  {
    assetClass: 'EQUITY',
    assetSubClass: 'STOCK',
    currency: 'USD',
    dataProviderInfo: {
      dataSource: 'YAHOO',
      isPremium: false
    },
    dataSource: null,
    name: 'Default 2',
    symbol: 'D2'
  }
];

const FILTERED_OPTIONS: LookupItem[] = [
  {
    assetClass: 'EQUITY',
    assetSubClass: 'ETF',
    currency: 'USD',
    dataProviderInfo: {
      dataSource: 'YAHOO',
      isPremium: false
    },
    dataSource: null,
    name: 'Autocomplete 1',
    symbol: 'A1'
  },
  {
    assetClass: 'EQUITY',
    assetSubClass: 'STOCK',
    currency: 'USD',
    dataProviderInfo: {
      dataSource: 'YAHOO',
      isPremium: false
    },
    dataSource: null,
    name: 'Autocomplete 2',
    symbol: 'A2'
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

export const Default: Story = {
  args: {}
};

export const WithDefaultItems: Story = {
  args: {
    defaultLookupItems: DEFAULT_OPTIONS
  }
};
