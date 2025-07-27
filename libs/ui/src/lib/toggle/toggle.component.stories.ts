import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatRadioModule } from '@angular/material/radio';
import { moduleMetadata } from '@storybook/angular';
import type { Meta, StoryObj } from '@storybook/angular';

import { GfToggleComponent } from './toggle.component';

export default {
  title: 'Toggle',
  component: GfToggleComponent,
  decorators: [
    moduleMetadata({
      imports: [CommonModule, MatRadioModule, ReactiveFormsModule]
    })
  ]
} as Meta<GfToggleComponent>;

type Story = StoryObj<GfToggleComponent>;

export const Default: Story = {
  args: {
    defaultValue: '1d',
    isLoading: false,
    options: [
      { label: 'Today', value: '1d' },
      { label: 'YTD', value: 'ytd' },
      { label: '1Y', value: '1y' },
      { label: '5Y', value: '5y' },
      { label: 'Max', value: 'max' }
    ]
  }
};
