import { ANIMATION_MODULE_TYPE } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import '@angular/localize/init';
import { MatFormFieldModule } from '@angular/material/form-field';
import { Meta, moduleMetadata, StoryObj } from '@storybook/angular';

import { GfCurrencySelectorComponent } from './currency-selector.component';

const CURRENCIES = [
  'AUD',
  'CHF',
  'EUR',
  'GBP',
  'GBp',
  'JPY',
  'USD',
  'XAU',
  'ZAR'
];

const meta: Meta<GfCurrencySelectorComponent> = {
  title: 'Currency Selector',
  component: GfCurrencySelectorComponent,
  decorators: [
    moduleMetadata({
      imports: [
        GfCurrencySelectorComponent,
        MatFormFieldModule,
        ReactiveFormsModule
      ],
      providers: [
        {
          provide: ANIMATION_MODULE_TYPE,
          useValue: 'NoopAnimations'
        }
      ]
    })
  ],
  render: ({ currencies, value }) => {
    return {
      props: {
        currencies,
        formGroup: new FormGroup({
          currency: new FormControl(value)
        })
      },
      template: `
        <form [formGroup]="formGroup">
          <mat-form-field appearance="outline" class="w-100">
            <mat-label>Currency</mat-label>
            <gf-currency-selector
              formControlName="currency"
              [currencies]="currencies"
            />
          </mat-form-field>
        </form>
      `
    };
  }
};

export default meta;

type Story = StoryObj<GfCurrencySelectorComponent>;

export const Default: Story = {
  args: {
    currencies: CURRENCIES,
    value: 'CHF'
  }
};

export const CurrencyOfEuropeanUnion: Story = {
  args: {
    currencies: CURRENCIES,
    value: 'EUR'
  }
};

export const DerivedCurrency: Story = {
  args: {
    currencies: CURRENCIES,
    value: 'GBp'
  }
};

export const SupranationalCurrency: Story = {
  args: {
    currencies: CURRENCIES,
    value: 'XAU'
  }
};

export const WithoutValue: Story = {
  args: {
    currencies: CURRENCIES,
    value: null
  }
};
