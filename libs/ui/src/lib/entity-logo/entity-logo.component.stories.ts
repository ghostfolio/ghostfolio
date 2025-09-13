import { CommonModule } from '@angular/common';
import { importProvidersFrom } from '@angular/core';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { applicationConfig, Meta, StoryObj } from '@storybook/angular';

import { EntityLogoImageSourceServiceMock } from '../mocks/entity-logo-image-source.service.mock';
import { EntityLogoImageSourceService } from './entity-logo-image-source.service';
import { GfEntityLogoComponent } from './entity-logo.component';

export default {
  title: 'Entity Logo',
  component: GfEntityLogoComponent,
  decorators: [
    applicationConfig({
      providers: [
        provideNoopAnimations(),
        importProvidersFrom(CommonModule),
        {
          provide: EntityLogoImageSourceService,
          useValue: new EntityLogoImageSourceServiceMock()
        }
      ]
    })
  ]
} as Meta<GfEntityLogoComponent>;

type Story = StoryObj<GfEntityLogoComponent>;

export const LogoByAssetProfileIdentifier: Story = {
  args: {
    dataSource: 'YAHOO',
    size: 'large',
    symbol: 'AAPL',
    tooltip: 'Apple Inc.'
  }
};

export const LogoByUrl: Story = {
  args: {
    size: 'large',
    tooltip: 'Ghostfolio',
    url: 'https://ghostfol.io'
  }
};
