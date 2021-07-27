import {
  hasNotDefinedValuesInObject,
  nullifyValuesInObject
} from '@ghostfolio/api/helper/object.helper';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data.service';
import { ImpersonationService } from '@ghostfolio/api/services/impersonation.service';
import {
  PortfolioItem,
  PortfolioOverview,
  PortfolioPerformance,
  PortfolioPosition,
  PortfolioReport
} from '@ghostfolio/common/interfaces';
import {
  getPermissions,
  hasPermission,
  permissions
} from '@ghostfolio/common/permissions';
import { RequestWithUser } from '@ghostfolio/common/types';
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
import { getReasonPhrase, StatusCodes } from 'http-status-codes';

import {
  HistoricalDataItem,
  PortfolioPositionDetail
} from './interfaces/portfolio-position-detail.interface';
import { PortfolioPositions } from './interfaces/portfolio-positions.interface';
import { PortfolioService } from './portfolio.service';

@Controller('portfolio')
export class PortfolioController {
  public constructor(
    private readonly exchangeRateDataService: ExchangeRateDataService,
    private readonly impersonationService: ImpersonationService,
    private portfolioService: PortfolioService,
    @Inject(REQUEST) private readonly request: RequestWithUser
  ) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  public async findAll(
    @Headers('impersonation-id') impersonationId
  ): Promise<PortfolioItem[]> {
    let portfolio = await this.portfolioService.findAll(impersonationId);

    if (
      impersonationId &&
      !hasPermission(
        getPermissions(this.request.user.role),
        permissions.readForeignPortfolio
      )
    ) {
      portfolio = portfolio.map((portfolioItem) => {
        Object.keys(portfolioItem.positions).forEach((symbol) => {
          portfolioItem.positions[symbol].investment =
            portfolioItem.positions[symbol].investment > 0 ? 1 : 0;
          portfolioItem.positions[symbol].investmentInOriginalCurrency =
            portfolioItem.positions[symbol].investmentInOriginalCurrency > 0
              ? 1
              : 0;
          portfolioItem.positions[symbol].quantity =
            portfolioItem.positions[symbol].quantity > 0 ? 1 : 0;
        });

        portfolioItem.investment = null;

        return portfolioItem;
      });
    }

    return portfolio;
  }

  @Get('chart')
  @UseGuards(AuthGuard('jwt'))
  public async getChart(
    @Headers('impersonation-id') impersonationId,
    @Query('range') range,
    @Res() res: Response
  ): Promise<HistoricalDataItem[]> {
    let chartData = await this.portfolioService.getChart(
      impersonationId,
      range
    );

    let hasNullValue = false;

    chartData.forEach((chartDataItem) => {
      if (hasNotDefinedValuesInObject(chartDataItem)) {
        hasNullValue = true;
      }
    });

    if (hasNullValue) {
      res.status(StatusCodes.ACCEPTED);
    }

    if (
      impersonationId &&
      !hasPermission(
        getPermissions(this.request.user.role),
        permissions.readForeignPortfolio
      )
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

    return <any>res.json(chartData);
  }

  @Get('details')
  @UseGuards(AuthGuard('jwt'))
  public async getDetails(
    @Headers('impersonation-id') impersonationId,
    @Query('range') range,
    @Res() res: Response
  ): Promise<{ [symbol: string]: PortfolioPosition }> {
    let details: { [symbol: string]: PortfolioPosition } = {};

    const impersonationUserId =
      await this.impersonationService.validateImpersonationId(
        impersonationId,
        this.request.user.id
      );

    const portfolio = await this.portfolioService.createPortfolio(
      impersonationUserId || this.request.user.id
    );

    try {
      details = await portfolio.getDetails(range);
    } catch (error) {
      console.error(error);

      res.status(StatusCodes.ACCEPTED);
    }

    if (hasNotDefinedValuesInObject(details)) {
      res.status(StatusCodes.ACCEPTED);
    }

    if (
      impersonationId &&
      !hasPermission(
        getPermissions(this.request.user.role),
        permissions.readForeignPortfolio
      )
    ) {
      const totalInvestment = Object.values(details)
        .map((portfolioPosition) => {
          return portfolioPosition.investment;
        })
        .reduce((a, b) => a + b, 0);

      const totalValue = Object.values(details)
        .map((portfolioPosition) => {
          return this.exchangeRateDataService.toCurrency(
            portfolioPosition.quantity * portfolioPosition.marketPrice,
            portfolioPosition.currency,
            this.request.user.Settings.currency
          );
        })
        .reduce((a, b) => a + b, 0);

      for (const [symbol, portfolioPosition] of Object.entries(details)) {
        portfolioPosition.grossPerformance = null;
        portfolioPosition.investment =
          portfolioPosition.investment / totalInvestment;

        for (const [account, { current, original }] of Object.entries(
          portfolioPosition.accounts
        )) {
          portfolioPosition.accounts[account].current = current / totalValue;
          portfolioPosition.accounts[account].original =
            original / totalInvestment;
        }

        portfolioPosition.quantity = null;
      }
    }

    return <any>res.json(details);
  }

  @Get('overview')
  @UseGuards(AuthGuard('jwt'))
  public async getOverview(
    @Headers('impersonation-id') impersonationId
  ): Promise<PortfolioOverview> {
    let overview = await this.portfolioService.getOverview(impersonationId);

    if (
      impersonationId &&
      !hasPermission(
        getPermissions(this.request.user.role),
        permissions.readForeignPortfolio
      )
    ) {
      overview = nullifyValuesInObject(overview, [
        'cash',
        'committedFunds',
        'fees',
        'totalBuy',
        'totalSell'
      ]);
    }

    return overview;
  }

  @Get('performance')
  @UseGuards(AuthGuard('jwt'))
  public async getPerformance(
    @Headers('impersonation-id') impersonationId,
    @Query('range') range,
    @Res() res: Response
  ): Promise<PortfolioPerformance> {
    const impersonationUserId =
      await this.impersonationService.validateImpersonationId(
        impersonationId,
        this.request.user.id
      );

    const portfolio = await this.portfolioService.createPortfolio(
      impersonationUserId || this.request.user.id
    );

    let performance = await portfolio.getPerformance(range);

    if (hasNotDefinedValuesInObject(performance)) {
      res.status(StatusCodes.ACCEPTED);
    }

    if (
      impersonationId &&
      !hasPermission(
        getPermissions(this.request.user.role),
        permissions.readForeignPortfolio
      )
    ) {
      performance = nullifyValuesInObject(performance, [
        'currentGrossPerformance',
        'currentNetPerformance',
        'currentValue'
      ]);
    }

    return <any>res.json(performance);
  }

  @Get('positions')
  @UseGuards(AuthGuard('jwt'))
  public async getPositions(
    @Headers('impersonation-id') impersonationId,
    @Query('range') range,
    @Res() res: Response
  ): Promise<PortfolioPositions> {
    const result = await this.portfolioService.getPositions(
      impersonationId,
      range
    );

    if (result?.hasErrors) {
      res.status(StatusCodes.ACCEPTED);
    }

    return <any>res.json(result);
  }

  @Get('position/:symbol')
  @UseGuards(AuthGuard('jwt'))
  public async getPosition(
    @Headers('impersonation-id') impersonationId,
    @Param('symbol') symbol
  ): Promise<PortfolioPositionDetail> {
    let position = await this.portfolioService.getPosition(
      impersonationId,
      symbol
    );

    if (position) {
      if (
        impersonationId &&
        !hasPermission(
          getPermissions(this.request.user.role),
          permissions.readForeignPortfolio
        )
      ) {
        position = nullifyValuesInObject(position, ['grossPerformance']);
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
    @Headers('impersonation-id') impersonationId
  ): Promise<PortfolioReport> {
    const impersonationUserId =
      await this.impersonationService.validateImpersonationId(
        impersonationId,
        this.request.user.id
      );

    const portfolio = await this.portfolioService.createPortfolio(
      impersonationUserId || this.request.user.id
    );

    return await portfolio.getReport();
  }
}
