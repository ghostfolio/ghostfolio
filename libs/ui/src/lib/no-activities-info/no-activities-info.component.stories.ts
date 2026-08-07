import { GfLogoComponent } from '@ghostfolio/ui/logo';

import { RouterTestingModule } from '@angular/router/testing';
import { moduleMetadata } from '@storybook/angular';
import type { Meta, StoryObj } from '@storybook/angular';

import { GfNoActivitiesInfoComponent } from './no-activities-info.component';

export default {
  component: GfNoActivitiesInfoComponent,
  decorators: [
    moduleMetadata({
      imports: [GfLogoComponent, RouterTestingModule]
    })
  ],
  title: 'No Activities Info'
} as Meta<GfNoActivitiesInfoComponent>;

type Story = StoryObj<GfNoActivitiesInfoComponent>;

export const Default: Story = {
  args: {}
};
