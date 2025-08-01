import { CommonModule } from '@angular/common';
import '@angular/localize/init';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { moduleMetadata } from '@storybook/angular';
import type { Meta, StoryObj } from '@storybook/angular';

import { GfLogoComponent } from '../logo';
import { GfMembershipCardComponent } from './membership-card.component';

const expiresAt = new Date();
expiresAt.setFullYear(expiresAt.getFullYear() + 1);

export default {
  title: 'Membership Card',
  component: GfMembershipCardComponent,
  decorators: [
    moduleMetadata({
      imports: [
        CommonModule,
        GfLogoComponent,
        IonIcon,
        MatButtonModule,
        RouterModule.forChild([])
      ],
      providers: [{ provide: ActivatedRoute, useValue: {} }]
    })
  ],
  argTypes: {
    name: {
      control: { type: 'select' },
      options: ['Basic', 'Premium']
    }
  }
} as Meta<GfMembershipCardComponent>;

type Story = StoryObj<GfMembershipCardComponent>;

export const Basic: Story = {
  args: {
    expiresAt: expiresAt.toLocaleDateString(),
    hasPermissionToCreateApiKey: false,
    name: 'Basic'
  }
};

export const Premium: Story = {
  args: {
    expiresAt: expiresAt.toLocaleDateString(),
    hasPermissionToCreateApiKey: true,
    name: 'Premium'
  }
};
