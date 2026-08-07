import { AccountWithPlatform } from '@ghostfolio/common/types';

import '@angular/localize/init';
import { Meta, moduleMetadata, StoryObj } from '@storybook/angular';

import { holdings } from '../mocks/holdings';
import { GfPortfolioFilterFormComponent } from './portfolio-filter-form.component';

const accounts: AccountWithPlatform[] = [
  {
    comment: null,
    createdAt: new Date('2025-06-01T06:53:10.569Z'),
    currency: 'USD',
    id: '733110b6-7c55-44eb-8cc5-c4c3e9d48a79',
    name: 'Trading Account',
    platform: {
      id: '9da3a8a7-4795-43e3-a6db-ccb914189737',
      name: 'Interactive Brokers',
      url: 'https://interactivebrokers.com'
    },
    platformId: '9da3a8a7-4795-43e3-a6db-ccb914189737',
    updatedAt: new Date('2025-06-01T06:53:10.569Z'),
    userId: '081aa387-487d-4438-83a4-3060eb2a016e'
  },
  {
    comment: null,
    createdAt: new Date('2025-06-01T06:48:53.055Z'),
    currency: 'USD',
    id: '24ba27d6-e04b-4fb4-b856-b24c2ef0422a',
    name: 'Investment Account',
    platform: {
      id: '43e8fcd1-5b79-4100-b678-d2229bd1660d',
      name: 'Fidelity',
      url: 'https://www.fidelity.com'
    },
    platformId: '43e8fcd1-5b79-4100-b678-d2229bd1660d',
    updatedAt: new Date('2025-06-01T06:48:53.055Z'),
    userId: '081aa387-487d-4438-83a4-3060eb2a016e'
  }
];

const meta: Meta<GfPortfolioFilterFormComponent> = {
  title: 'Portfolio Filter Form',
  component: GfPortfolioFilterFormComponent,
  decorators: [
    moduleMetadata({
      imports: [GfPortfolioFilterFormComponent]
    })
  ]
};

export default meta;
type Story = StoryObj<GfPortfolioFilterFormComponent>;

export const Default: Story = {
  args: {
    accounts,
    holdings,
    assetClasses: [
      { id: 'COMMODITY', label: 'Commodity', type: 'ASSET_CLASS' },
      { id: 'EQUITY', label: 'Equity', type: 'ASSET_CLASS' },
      { id: 'FIXED_INCOME', label: 'Fixed Income', type: 'ASSET_CLASS' }
    ],
    disabled: false,
    tags: [
      {
        id: 'EMERGENCY_FUND',
        label: 'Emergency Fund',
        type: 'TAG'
      },
      {
        id: 'RETIREMENT_FUND',
        label: 'Retirement Fund',
        type: 'TAG'
      }
    ]
  }
};

export const Disabled: Story = {
  args: {
    ...Default.args,
    disabled: true
  }
};
