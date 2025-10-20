import { GfLogoComponent } from '@ghostfolio/ui/logo';

import { RouterTestingModule } from '@angular/router/testing';
import { moduleMetadata } from '@storybook/angular';
import type { Meta, StoryObj } from '@storybook/angular';

import { GfNoTransactionsInfoComponent } from './no-transactions-info.component';

export default {
  title: 'No Transactions Info',
  component: GfNoTransactionsInfoComponent,
  decorators: [
    moduleMetadata({
      imports: [GfLogoComponent, RouterTestingModule]
    })
  ]
} as Meta<GfNoTransactionsInfoComponent>;

type Story = StoryObj<GfNoTransactionsInfoComponent>;

export const Default: Story = {
  args: {}
};
