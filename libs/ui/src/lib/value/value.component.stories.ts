import { Meta, Story, moduleMetadata } from '@storybook/angular';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

import { ValueComponent } from './value.component';

export default {
  title: 'Value',
  component: ValueComponent,
  decorators: [
    moduleMetadata({
      imports: [NgxSkeletonLoaderModule]
    })
  ]
} as Meta<ValueComponent>;

const Template: Story<ValueComponent> = (args: ValueComponent) => ({
  props: args
});

export const Loading = Template.bind({});
Loading.args = {
  value: undefined
};

export const Currency = Template.bind({});
Currency.args = {
  currency: 'USD',
  locale: 'en-US',
  value: 7
};

export const Integer = Template.bind({});
Integer.args = {
  isInteger: true,
  locale: 'en-US',
  value: 7
};

export const Label = Template.bind({});
Label.args = {
  isInteger: true,
  label: 'Label',
  locale: 'en-US',
  value: 7
};
