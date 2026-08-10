import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatRadioModule } from '@angular/material/radio';
import { IonIcon } from '@ionic/angular/standalone';
import { moduleMetadata } from '@storybook/angular';
import type { Meta, StoryObj } from '@storybook/angular';
import { addIcons } from 'ionicons';
import { gridOutline, reorderFourOutline } from 'ionicons/icons';

import { GfToggleComponent } from './toggle.component';

addIcons({ gridOutline, reorderFourOutline });

export default {
  title: 'Toggle',
  component: GfToggleComponent,
  decorators: [
    moduleMetadata({
      imports: [CommonModule, IonIcon, MatRadioModule, ReactiveFormsModule]
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

export const WithIcons: Story = {
  args: {
    defaultValue: 'TABLE',
    isLoading: false,
    options: [
      {
        iconName: 'reorder-four-outline',
        title: 'Table',
        value: 'TABLE'
      },
      {
        iconName: 'grid-outline',
        title: 'Chart',
        value: 'CHART'
      }
    ]
  }
};
