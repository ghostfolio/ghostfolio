import { moduleMetadata } from '@storybook/angular';
import type { Meta, StoryObj } from '@storybook/angular';

import { GfLogoComponent } from './logo.component';

export default {
  title: 'Logo',
  component: GfLogoComponent,
  decorators: [
    moduleMetadata({
      imports: []
    })
  ]
} as Meta<GfLogoComponent>;

type Story = StoryObj<GfLogoComponent>;

export const Default: Story = {
  args: {}
};

export const Large: Story = {
  args: {
    size: 'large'
  }
};

export const NoLabel: Story = {
  args: {
    showLabel: false
  }
};
