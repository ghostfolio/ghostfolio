import { CommonModule } from '@angular/common';
import { moduleMetadata } from '@storybook/angular';
import type { Meta, StoryObj } from '@storybook/angular';
import { IonIcon } from '@ionic/angular/standalone';

import { GfActivityTypeComponent } from './activity-type.component';

export default {
  title: 'Activity Type',
  component: GfActivityTypeComponent,
  decorators: [
    moduleMetadata({
      imports: [CommonModule, IonIcon]
    })
  ]
} as Meta<GfActivityTypeComponent>;

type Story = StoryObj<GfActivityTypeComponent>;

export const Default: Story = {
  args: {
    activityType: 'BUY'
  }
};

export const Buy: Story = {
  args: {
    activityType: 'BUY'
  }
};

export const Dividend: Story = {
  args: {
    activityType: 'DIVIDEND'
  }
};

export const Fee: Story = {
  args: {
    activityType: 'FEE'
  }
};

export const Interest: Story = {
  args: {
    activityType: 'INTEREST'
  }
};

export const Liability: Story = {
  args: {
    activityType: 'LIABILITY'
  }
};

export const Sell: Story = {
  args: {
    activityType: 'SELL'
  }
}; 