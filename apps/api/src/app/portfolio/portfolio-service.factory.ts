import { Injectable } from '@nestjs/common';
import { PortfolioService } from './portfolio.service';
import { PortfolioServiceNew } from './portfolio.service-new';

@Injectable()
export class PortfolioServiceFactory {
  public constructor(
    private readonly portfolioService: PortfolioService,
    private readonly portfolioServiceNew: PortfolioServiceNew
  ) {}

  public get() {
    if (false) {
      return this.portfolioServiceNew;
    }

    return this.portfolioService;
  }
}
