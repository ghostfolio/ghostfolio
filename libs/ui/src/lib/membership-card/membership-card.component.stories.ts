import { CommonModule } from '@angular/common';
import '@angular/localize/init';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { moduleMetadata } from '@storybook/angular';
import type { Meta, StoryObj } from '@storybook/angular';
import { addYears } from 'date-fns';

import { GfLogoComponent } from '../logo';
import { GfMembershipCardComponent } from './membership-card.component';

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
    hover3d: {
      control: { type: 'boolean' }
    },
    name: {
      control: { type: 'select' },
      options: ['Basic', 'Premium']
    }
  }
} as Meta<GfMembershipCardComponent>;

type Story = StoryObj<GfMembershipCardComponent>;

export const Basic: Story = {
  args: {
    hover3d: false,
    name: 'Basic'
  }
};

export const Premium: Story = {
  args: {
    expiresAt: addYears(new Date(), 1).toLocaleDateString(),
    hasPermissionToCreateApiKey: true,
    hover3d: false,
    name: 'Premium'
  }
};
