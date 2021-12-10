import { GfLogoModule } from '@ghostfolio/ui/logo';
import { Meta, Story, moduleMetadata } from '@storybook/angular';

import { NoTransactionsInfoComponent } from './no-transactions-info.component';

export default {
  title: 'No Transactions Info',
  component: NoTransactionsInfoComponent,
  decorators: [
    moduleMetadata({
      imports: [GfLogoModule]
    })
  ]
} as Meta<NoTransactionsInfoComponent>;

const Template: Story<NoTransactionsInfoComponent> = (
  args: NoTransactionsInfoComponent
) => ({
  props: args
});

export const Default = Template.bind({});
Default.args = {};
