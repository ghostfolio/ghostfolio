import { CommonModule } from '@angular/common';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Meta, moduleMetadata, StoryObj } from '@storybook/angular';

import { GfTagsSelectorComponent } from './tags-selector.component';

export default {
  title: 'Tags Selector',
  component: GfTagsSelectorComponent,
  decorators: [
    moduleMetadata({
      imports: [CommonModule, NoopAnimationsModule]
    })
  ]
} as Meta<GfTagsSelectorComponent>;

type Story = StoryObj<GfTagsSelectorComponent>;

const OPTIONS = [
  {
    id: 'EMERGENCY_FUND',
    name: 'Emergency Fund',
    userId: null
  },
  {
    id: 'RETIREMENT_FUND',
    name: 'Retirement Fund',
    userId: null
  },
  {
    id: '3ef7e6d9-4598-4eb2-b0e8-00e61cfc0ea6',
    name: 'Gambling',
    userId: 'c6a71541-d0e3-4e22-ae83-b5e5611b6695'
  }
];

export const Default: Story = {
  args: {
    tags: [
      {
        id: 'EMERGENCY_FUND',
        name: 'Emergency Fund',
        userId: null
      }
    ],
    tagsAvailable: OPTIONS
  }
};

export const NoSelected: Story = {
  args: {
    tags: [],
    tagsAvailable: OPTIONS
  }
};

export const NoOptions: Story = {
  args: {
    tags: [],
    tagsAvailable: []
  }
};
