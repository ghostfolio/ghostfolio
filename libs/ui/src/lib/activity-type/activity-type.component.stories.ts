import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular/standalone';
import { moduleMetadata } from '@storybook/angular';
import type { Meta, StoryObj } from '@storybook/angular';

import { GfActivityTypeComponent } from './activity-type.component';

export default {
  title: 'Activity Type',
  component: GfActivityTypeComponent,
  decorators: [
    moduleMetadata({
      imports: [CommonModule, IonIcon]
    })
  ],
  argTypes: {
    activityType: {
      control: 'select',
      options: ['BUY', 'DIVIDEND', 'FEE', 'INTEREST', 'LIABILITY', 'SELL']
    }
  }
} as Meta<GfActivityTypeComponent>;

type Story = StoryObj<GfActivityTypeComponent>;

export const Default: Story = {
  args: {
    activityType: 'BUY'
  }
};
