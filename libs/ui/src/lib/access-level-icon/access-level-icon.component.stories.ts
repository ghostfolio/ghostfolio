import { CommonModule } from '@angular/common';
import { moduleMetadata } from '@storybook/angular';
import type { Meta, StoryObj } from '@storybook/angular';

import { GfAccessLevelIconComponent } from './access-level-icon.component';

export default {
  title: 'Access Level Icon',
  component: GfAccessLevelIconComponent,
  decorators: [
    moduleMetadata({
      imports: [CommonModule]
    })
  ],
  argTypes: {
    accessLevel: {
      control: 'select',
      options: [
        'CREATE_READ_RESTRICTED_UPDATE_DELETE',
        'CREATE_READ_UPDATE_DELETE',
        'READ',
        'READ_RESTRICTED'
      ]
    }
  }
} as Meta<GfAccessLevelIconComponent>;

type Story = StoryObj<GfAccessLevelIconComponent>;

export const RestrictedView: Story = {
  args: {
    accessLevel: 'READ_RESTRICTED'
  }
};

export const RestrictedViewAndManage: Story = {
  args: {
    accessLevel: 'CREATE_READ_RESTRICTED_UPDATE_DELETE'
  }
};

export const View: Story = {
  args: {
    accessLevel: 'READ'
  }
};

export const ViewAndManage: Story = {
  args: {
    accessLevel: 'CREATE_READ_UPDATE_DELETE'
  }
};
