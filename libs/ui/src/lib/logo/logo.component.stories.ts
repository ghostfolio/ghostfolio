import { Meta, Story, moduleMetadata } from '@storybook/angular';

import { LogoComponent } from './logo.component';

export default {
  title: 'Logo',
  component: LogoComponent,
  decorators: [
    moduleMetadata({
      imports: []
    })
  ]
} as Meta<LogoComponent>;

const Template: Story<LogoComponent> = (args: LogoComponent) => ({
  props: args
});

export const Default = Template.bind({});
Default.args = {};

export const Large = Template.bind({});
Large.args = {
  size: 'large'
};

export const NoName = Template.bind({});
NoName.args = {
  hideName: true
};
