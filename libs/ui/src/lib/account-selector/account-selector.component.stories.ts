import { AccountWithPlatform } from '@ghostfolio/common/types';

import { CommonModule } from '@angular/common';
import { ANIMATION_MODULE_TYPE, importProvidersFrom } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import '@angular/localize/init';
import {
  applicationConfig,
  Meta,
  moduleMetadata,
  StoryObj
} from '@storybook/angular';

import { EntityLogoImageSourceService } from '../entity-logo/entity-logo-image-source.service';
import { EntityLogoImageSourceServiceMock } from '../mocks/entity-logo-image-source.service.mock';
import { GfAccountSelectorComponent } from './account-selector.component';

const ACCOUNTS: AccountWithPlatform[] = [
  {
    comment: null,
    createdAt: new Date('2024-01-01'),
    currency: 'USD',
    id: '3ef7e6d9-4598-4eb2-b0e8-00e61cfc0ea6',
    name: 'Coinbase Account',
    platform: {
      id: '9da3a8a7-4795-43e3-a6db-ccb914189737',
      name: 'Coinbase',
      url: 'https://coinbase.com'
    },
    platformId: '9da3a8a7-4795-43e3-a6db-ccb914189737',
    updatedAt: new Date('2024-01-01'),
    userId: '081aa387-487d-4438-83a4-3060eb2a016e'
  },
  {
    comment: null,
    createdAt: new Date('2024-01-01'),
    currency: 'CHF',
    id: '9da3a8a7-4795-43e3-a6db-ccb914189737',
    name: 'Ghostfolio Account',
    platform: {
      id: 'f3e9d0e5-1e0f-4a3c-8b12-1f2a3b4c5d6e',
      name: 'Ghostfolio',
      url: 'https://ghostfol.io'
    },
    platformId: 'f3e9d0e5-1e0f-4a3c-8b12-1f2a3b4c5d6e',
    updatedAt: new Date('2024-01-01'),
    userId: '081aa387-487d-4438-83a4-3060eb2a016e'
  },
  {
    comment: null,
    createdAt: new Date('2024-01-01'),
    currency: 'EUR',
    id: 'd191b2d5-9d5a-4c5f-9d55-6f0e5f6a7b8c',
    name: 'Savings Account',
    platformId: null,
    updatedAt: new Date('2024-01-01'),
    userId: '081aa387-487d-4438-83a4-3060eb2a016e'
  }
];

type AccountSelectorStory = GfAccountSelectorComponent & {
  value: string | null;
};

const meta: Meta<AccountSelectorStory> = {
  title: 'Account Selector',
  component: GfAccountSelectorComponent,
  decorators: [
    applicationConfig({
      providers: [
        importProvidersFrom(CommonModule),
        {
          provide: ANIMATION_MODULE_TYPE,
          useValue: 'NoopAnimations'
        },
        {
          provide: EntityLogoImageSourceService,
          useValue: new EntityLogoImageSourceServiceMock()
        }
      ]
    }),
    moduleMetadata({
      imports: [GfAccountSelectorComponent, ReactiveFormsModule]
    })
  ],
  render: ({ accounts, hasHint, hasNullOption, label, value }) => {
    return {
      props: {
        accounts,
        hasHint,
        hasNullOption,
        label,
        formGroup: new FormGroup({
          account: new FormControl(value)
        })
      },
      template: `
        <form [formGroup]="formGroup">
          <gf-account-selector
            formControlName="account"
            [accounts]="accounts"
            [hasHint]="hasHint"
            [hasNullOption]="hasNullOption"
            [label]="label"
          />
        </form>
      `
    };
  }
};

export default meta;

type Story = StoryObj<AccountSelectorStory>;

export const Default: Story = {
  args: {
    accounts: ACCOUNTS,
    label: 'Account',
    value: '9da3a8a7-4795-43e3-a6db-ccb914189737'
  }
};

export const WithNullOption: Story = {
  args: {
    accounts: ACCOUNTS,
    hasNullOption: true,
    label: 'Account',
    value: null
  }
};
