import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { DataSource } from '@prisma/client';

import { HttpClientMock } from '../mocks/httpClient.mock';
import { GfEntityLogoComponent } from './entity-logo.component';

export default {
  title: 'Entity Logo',
  component: GfEntityLogoComponent,
  decorators: [
    applicationConfig({
      providers: [
        importProvidersFrom(CommonModule),
        {
          provide: HttpClient,
          useValue: new HttpClientMock(
            new Map([
              [
                '/api/v1/logo?url=https://ghostfol.io',
                {
                  logoUrl: 'https://ghostfol.io/logo.png'
                }
              ]
            ])
          )
        }
      ]
    })
  ]
} as Meta<GfEntityLogoComponent>;

type Story = StoryObj<GfEntityLogoComponent>;

export const Default: Story = {
  args: {
    dataSource: DataSource.MANUAL,
    symbol: 'GHOST'
  }
};

export const WithUrl: Story = {
  args: {
    size: 'large',
    tooltip: 'Ghostfolio',
    url: 'https://ghostfol.io'
  }
}; 