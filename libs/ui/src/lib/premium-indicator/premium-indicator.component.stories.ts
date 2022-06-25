import { CommonModule } from '@angular/common';
import { RouterTestingModule } from '@angular/router/testing';
import { Meta, Story, moduleMetadata } from '@storybook/angular';

import { PremiumIndicatorComponent } from './premium-indicator.component';

export default {
  title: 'Premium Indicator',
  component: PremiumIndicatorComponent,
  decorators: [
    moduleMetadata({
      imports: [CommonModule, RouterTestingModule]
    })
  ]
} as Meta<PremiumIndicatorComponent>;

const Template: Story<PremiumIndicatorComponent> = (
  args: PremiumIndicatorComponent
) => ({
  props: args
});

export const Default = Template.bind({});
Default.args = {};

export const WithoutLink = Template.bind({});
WithoutLink.args = {
  enableLink: false
};
