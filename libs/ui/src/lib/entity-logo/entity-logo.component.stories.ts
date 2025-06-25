import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { DataSource } from '@prisma/client';
import { applicationConfig, Meta, StoryObj } from '@storybook/angular';

import { HttpClientMock } from '../mocks/httpClient.mock';
import { GfEntityLogoComponent } from './entity-logo.component';

export default {
  title: 'Entity Logo',
  component: GfEntityLogoComponent,
  decorators: [
    applicationConfig({
      providers: [
        importProvidersFrom(CommonModule, HttpClientModule),
        {
          provide: HttpClient,
          useValue: new HttpClientMock(
            new Map([
              [
                '../api/v1/logo/MANUAL/GHOST',
                {
                  logoUrl: '/assets/ghost.svg'
                }
              ],
              [
                '../api/v1/logo?url=https://ghostfol.io',
                {
                  logoUrl: '/assets/ghost.svg'
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
    symbol: 'GHOST',
    useLogo: true,
    size: 'large'
  }
};

export const WithUrl: Story = {
  args: {
    size: 'large',
    tooltip: 'Ghostfolio',
    url: 'https://ghostfol.io',
    useLogo: true
  }
};
