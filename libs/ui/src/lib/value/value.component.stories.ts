import { moduleMetadata, Story, Meta } from '@storybook/angular';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { ValueComponent } from './value.component';

export default {
  title: 'Value',
  component: ValueComponent,
  decorators: [
    moduleMetadata({
      imports: [NgxSkeletonLoaderModule],
    })
  ],
} as Meta<ValueComponent>;

const Template: Story<ValueComponent> = (args: ValueComponent) => ({
  props: args,
});

export const Loading = Template.bind({});
Loading.args = {
  value: undefined
}

export const Integer = Template.bind({});
Integer.args = {
  isInteger: true,
  locale: 'en',
  value: 7
}

export const Currency = Template.bind({});
Currency.args = {
  currency: 'USD',
  isInteger: true,
  label: 'Label',
  locale: 'en',
  value: 7
}
