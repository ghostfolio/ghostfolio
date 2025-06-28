import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import {
  applicationConfig,
  Meta,
  moduleMetadata,
  StoryObj
} from '@storybook/angular';

import { GfLogoComponent } from '../logo/logo.component';
import { HttpClientMock } from '../mocks/httpClient.mock';
import { GfEntityLogoComponent } from './entity-logo.component';

export default {
  title: 'Entity Logo',
  component: GfEntityLogoComponent,
  decorators: [
    moduleMetadata({
      imports: [CommonModule, HttpClientModule, GfLogoComponent]
    }),
    applicationConfig({
      providers: [
        {
          provide: HttpClient,
          useValue: new HttpClientMock(
            new Map<string, any>([
              [
                '../api/v1/logo?url=https://ghostfol.io',
                { logoUrl: '/assets/ghost.svg' }
              ]
            ])
          )
        }
      ]
    })
  ],
  parameters: {
    backgrounds: {
      default: 'light'
    }
  },
  argTypes: {
    size: {
      control: 'select',
      options: ['large', 'medium'],
      description: 'Size of the logo'
    },
    tooltip: {
      control: 'text',
      description: 'Tooltip text for the logo'
    },
    url: {
      control: 'text',
      description: 'URL for the logo'
    }
  }
} as Meta<GfEntityLogoComponent>;

type Story = StoryObj<GfEntityLogoComponent>;

export const Default: Story = {
  args: {
    size: 'large',
    tooltip: 'Ghostfolio',
    url: 'https://ghostfol.io'
  },
  parameters: {
    docs: {
      description: {
        story:
          'Entity logo component with size ("large"), tooltip ("Ghostfolio") and url ("https://ghostfol.io") inputs.'
      }
    }
  },
  render: (args) => ({
    props: args,
    template: `
      <div>
        <gf-logo [showLabel]="true" [size]="size"></gf-logo>
      </div>
    `
  })
};
