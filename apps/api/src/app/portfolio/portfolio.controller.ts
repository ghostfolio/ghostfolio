import { AccessService } from '@ghostfolio/api/app/access/access.service';
import { UserService } from '@ghostfolio/api/app/user/user.service';
import {
  hasNotDefinedValuesInObject,
  nullifyValuesInObject
} from '@ghostfolio/api/helper/object.helper';
import { ConfigurationService } from '@ghostfolio/api/services/configuration.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data.service';
import { baseCurrency } from '@ghostfolio/common/config';
import {
  PortfolioChart,
  PortfolioDetails,
  PortfolioInvestments,
  PortfolioPerformance,
  PortfolioPublicDetails,
  PortfolioReport,
  PortfolioSummary
} from '@ghostfolio/common/interfaces';
import type { RequestWithUser } from '@ghostfolio/common/types';
import {
  Controller,
  Get,
  Headers,
  HttpException,
  Inject,
  Param,
  Query,
  Res,
  UseGuards
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';

import { PortfolioPositionDetail } from './interfaces/portfolio-position-detail.interface';
import { PortfolioPositions } from './interfaces/portfolio-positions.interface';
import { PortfolioServiceStrategy } from './portfolio-service.strategy';

@Controller('portfolio')
export class PortfolioController {
  public constructor(
    private readonly accessService: AccessService,
    private readonly configurationService: ConfigurationService,
    private readonly exchangeRateDataService: ExchangeRateDataService,
    private readonly portfolioServiceStrategy: PortfolioServiceStrategy,
    @Inject(REQUEST) private readonly request: RequestWithUser,
    private readonly userService: UserService
  ) {}

  @Get('chart')
  @UseGuards(AuthGuard('jwt'))
  public async getChart(
    @Headers('impersonation-id') impersonationId: string,
    @Query('range') range,
    @Res() res: Response
  ): Promise<PortfolioChart> {
    const historicalDataContainer = await this.portfolioServiceStrategy
      .get()
      .getChart(impersonationId, range);

    let chartData = historicalDataContainer.items;

    let hasError = false;

    chartData.forEach((chartDataItem) => {
      if (hasNotDefinedValuesInObject(chartDataItem)) {
        hasError = true;
      }
    });

    if (
      impersonationId ||
      this.userService.isRestrictedView(this.request.user)
    ) {
      let maxValue = 0;

      chartData.forEach((portfolioItem) => {
        if (portfolioItem.value > maxValue) {
          maxValue = portfolioItem.value;
        }
      });

      chartData = chartData.map((historicalDataItem) => {
        return {
          ...historicalDataItem,
          marketPrice: Number((historicalDataItem.value / maxValue).toFixed(2))
        };
      });
    }

    return <any>res.json({
      hasError,
      chart: chartData,
      isAllTimeHigh: historicalDataContainer.isAllTimeHigh,
      isAllTimeLow: historicalDataContainer.isAllTimeLow
    });
  }

  @Get('details')
  @UseGuards(AuthGuard('jwt'))
  public async getDetails(
    @Headers('impersonation-id') impersonationId: string,
    @Query('range') range,
    @Res() res: Response
  ): Promise<PortfolioDetails> {
    if (
      this.configurationService.get('ENABLE_FEATURE_SUBSCRIPTION') &&
      this.request.user.subscription.type === 'Basic'
    ) {
      res.status(StatusCodes.FORBIDDEN);
      return <any>res.json({ accounts: {}, holdings: {} });
    }

    let hasError = false;

    const { accounts, holdings, hasErrors } =
      await this.portfolioServiceStrategy
        .get()
        .getDetails(impersonationId, this.request.user.id, range);

    if (hasErrors || hasNotDefinedValuesInObject(holdings)) {
      hasError = true;
    }

    if (
      impersonationId ||
      this.userService.isRestrictedView(this.request.user)
    ) {
      const totalInvestment = Object.values(holdings)
        .map((portfolioPosition) => {
          return portfolioPosition.investment;
        })
        .reduce((a, b) => a + b, 0);

      const totalValue = Object.values(holdings)
        .map((portfolioPosition) => {
          return this.exchangeRateDataService.toCurrency(
            portfolioPosition.quantity * portfolioPosition.marketPrice,
            portfolioPosition.currency,
            this.request.user.Settings.currency
          );
        })
        .reduce((a, b) => a + b, 0);

      for (const [symbol, portfolioPosition] of Object.entries(holdings)) {
        portfolioPosition.grossPerformance = null;
        portfolioPosition.investment =
          portfolioPosition.investment / totalInvestment;
        portfolioPosition.netPerformance = null;
        portfolioPosition.quantity = null;
        portfolioPosition.value = portfolioPosition.value / totalValue;
      }

      for (const [name, { current, original }] of Object.entries(accounts)) {
        accounts[name].current = current / totalValue;
        accounts[name].original = original / totalInvestment;
      }
    }

    return <any>res.json({ accounts, hasError, holdings });
  }

  @Get('investments')
  @UseGuards(AuthGuard('jwt'))
  public async getInvestments(
    @Headers('impersonation-id') impersonationId: string,
    @Res() res: Response
  ): Promise<PortfolioInvestments> {
    if (
      this.configurationService.get('ENABLE_FEATURE_SUBSCRIPTION') &&
      this.request.user.subscription.type === 'Basic'
    ) {
      res.status(StatusCodes.FORBIDDEN);
      return <any>res.json({});
    }

    let investments = await this.portfolioServiceStrategy
      .get()
      .getInvestments(impersonationId);

    if (
      impersonationId ||
      this.userService.isRestrictedView(this.request.user)
    ) {
      const maxInvestment = investments.reduce(
        (investment, item) => Math.max(investment, item.investment),
        1
      );

      investments = investments.map((item) => ({
        date: item.date,
        investment: item.investment / maxInvestment
      }));
    }

    return <any>res.json({ firstOrderDate: investments[0]?.date, investments });
  }

  @Get('performance')
  @UseGuards(AuthGuard('jwt'))
  public async getPerformance(
    @Headers('impersonation-id') impersonationId: string,
    @Query('range') range,
    @Res() res: Response
  ): Promise<{ hasErrors: boolean; performance: PortfolioPerformance }> {
    const performanceInformation = await this.portfolioServiceStrategy
      .get()
      .getPerformance(impersonationId, range);

    if (
      impersonationId ||
      this.userService.isRestrictedView(this.request.user)
    ) {
      performanceInformation.performance = nullifyValuesInObject(
        performanceInformation.performance,
        ['currentGrossPerformance', 'currentValue']
      );
    }

    return <any>res.json(performanceInformation);
  }

  @Get('positions')
  @UseGuards(AuthGuard('jwt'))
  public async getPositions(
    @Headers('impersonation-id') impersonationId: string,
    @Query('range') range,
    @Res() res: Response
  ): Promise<PortfolioPositions> {
    const result = await this.portfolioServiceStrategy
      .get()
      .getPositions(impersonationId, range);

    if (
      impersonationId ||
      this.userService.isRestrictedView(this.request.user)
    ) {
      result.positions = result.positions.map((position) => {
        return nullifyValuesInObject(position, [
          'grossPerformance',
          'investment',
          'netPerformance',
          'quantity'
        ]);
      });
    }

    return <any>res.json(result);
  }

  @Get('public/:accessId')
  public async getPublic(
    @Param('accessId') accessId,
    @Res() res: Response
  ): Promise<PortfolioPublicDetails> {
    const access = await this.accessService.access({ id: accessId });
    const user = await this.userService.user({
      id: access.userId
    });

    if (!access) {
      res.status(StatusCodes.NOT_FOUND);
      return <any>res.json({ accounts: {}, holdings: {} });
    }

    let hasDetails = true;
    if (this.configurationService.get('ENABLE_FEATURE_SUBSCRIPTION')) {
      hasDetails = user.subscription.type === 'Premium';
    }

    const { holdings } = await this.portfolioServiceStrategy
      .get()
      .getDetails(access.userId, access.userId);

    const portfolioPublicDetails: PortfolioPublicDetails = {
      hasDetails,
      holdings: {}
    };

    const totalValue = Object.values(holdings)
      .filter((holding) => {
        return holding.assetClass === 'EQUITY';
      })
      .map((portfolioPosition) => {
        return this.exchangeRateDataService.toCurrency(
          portfolioPosition.quantity * portfolioPosition.marketPrice,
          portfolioPosition.currency,
          this.request.user?.Settings?.currency ?? baseCurrency
        );
      })
      .reduce((a, b) => a + b, 0);

    for (const [symbol, portfolioPosition] of Object.entries(holdings)) {
      if (portfolioPosition.assetClass === 'EQUITY') {
        portfolioPublicDetails.holdings[symbol] = {
          allocationCurrent: portfolioPosition.allocationCurrent,
          countries: hasDetails ? portfolioPosition.countries : [],
          currency: portfolioPosition.currency,
          name: portfolioPosition.name,
          sectors: hasDetails ? portfolioPosition.sectors : [],
          value: portfolioPosition.value / totalValue
        };
      }
    }

    return <any>res.json(portfolioPublicDetails);
  }

  @Get('summary')
  @UseGuards(AuthGuard('jwt'))
  public async getSummary(
    @Headers('impersonation-id') impersonationId
  ): Promise<PortfolioSummary> {
    let summary = await this.portfolioServiceStrategy
      .get()
      .getSummary(impersonationId);

    if (
      impersonationId ||
      this.userService.isRestrictedView(this.request.user)
    ) {
      summary = nullifyValuesInObject(summary, [
        'cash',
        'committedFunds',
        'currentGrossPerformance',
        'currentNetPerformance',
        'currentValue',
        'dividend',
        'fees',
        'netWorth',
        'totalBuy',
        'totalSell'
      ]);
    }

    return summary;
  }

  @Get('position/:symbol')
  @UseGuards(AuthGuard('jwt'))
  public async getPosition(
    @Headers('impersonation-id') impersonationId: string,
    @Param('symbol') symbol
  ): Promise<PortfolioPositionDetail> {
    let position = await this.portfolioServiceStrategy
      .get()
      .getPosition(impersonationId, symbol);

    if (position) {
      if (
        impersonationId ||
        this.userService.isRestrictedView(this.request.user)
      ) {
        position = nullifyValuesInObject(position, [
          'grossPerformance',
          'investment',
          'netPerformance',
          'orders',
          'quantity',
          'value'
        ]);
      }

      return position;
    }

    throw new HttpException(
      getReasonPhrase(StatusCodes.NOT_FOUND),
      StatusCodes.NOT_FOUND
    );
  }

  @Get('report')
  @UseGuards(AuthGuard('jwt'))
  public async getReport(
    @Headers('impersonation-id') impersonationId: string,
    @Res() res: Response
  ): Promise<PortfolioReport> {
    if (
      this.configurationService.get('ENABLE_FEATURE_SUBSCRIPTION') &&
      this.request.user.subscription.type === 'Basic'
    ) {
      res.status(StatusCodes.FORBIDDEN);
      return <any>res.json({ rules: [] });
    }

    return <any>(
      res.json(
        await this.portfolioServiceStrategy.get().getReport(impersonationId)
      )
    );
  }
}
