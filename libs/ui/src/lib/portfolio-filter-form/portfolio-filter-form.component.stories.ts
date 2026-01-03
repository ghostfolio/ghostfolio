import '@angular/localize/init';
import { Meta, moduleMetadata, StoryObj } from '@storybook/angular';

import { GfPortfolioFilterFormComponent } from './portfolio-filter-form.component';

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
    accounts: [
      {
        id: '733110b6-7c55-44eb-8cc5-c4c3e9d48a79',
        name: 'Trading Account',
        platform: {
          name: 'Interactive Brokers',
          url: 'https://interactivebrokers.com'
        }
      },
      {
        id: '24ba27d6-e04b-4fb4-b856-b24c2ef0422a',
        name: 'Investment Account',
        platform: {
          name: 'Fidelity',
          url: 'https://fidelity.com'
        }
      }
    ] as any,
    assetClasses: [
      { id: 'COMMODITY', label: 'Commodity', type: 'ASSET_CLASS' },
      { id: 'EQUITY', label: 'Equity', type: 'ASSET_CLASS' },
      { id: 'FIXED_INCOME', label: 'Fixed Income', type: 'ASSET_CLASS' }
    ] as any,
    holdings: [
      {
        currency: 'USD',
        dataSource: 'YAHOO',
        name: 'Apple Inc.',
        symbol: 'AAPL'
      },
      {
        currency: 'USD',
        dataSource: 'YAHOO',
        name: 'Microsoft Corporation',
        symbol: 'MSFT'
      }
    ] as any,
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
    ] as any,
    disabled: false
  }
};

export const Disabled: Story = {
  args: {
    ...Default.args,
    disabled: true
  }
};
