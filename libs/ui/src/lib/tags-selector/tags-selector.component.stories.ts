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
    userId: '1'
  },
  {
    id: 'RETIREMENT_FUND',
    name: 'Retirement Fund',
    userId: '2'
  }
];

export const Default: Story = {
  args: {
    tags: [
      {
        id: 'EMERGENCY_FUND',
        name: 'Emergency Fund',
        userId: '1'
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
