import type { RequestWithUser } from '@ghostfolio/common/types';
import { Inject, Injectable } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';

import { PortfolioService } from './portfolio.service';
import { PortfolioServiceNew } from './portfolio.service-new';

@Injectable()
export class PortfolioServiceStrategy {
  public constructor(
    private readonly portfolioService: PortfolioService,
    private readonly portfolioServiceNew: PortfolioServiceNew,
    @Inject(REQUEST) private readonly request: RequestWithUser
  ) {}

  public get() {
    if (
      this.request.user?.Settings?.settings?.['isNewCalculationEngine'] === true
    ) {
      return this.portfolioServiceNew;
    }

    return this.portfolioService;
  }
}
