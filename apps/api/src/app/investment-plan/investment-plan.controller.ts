import { PortfolioService } from '@ghostfolio/api/app/portfolio/portfolio.service';
import type { RequestWithUser } from '@ghostfolio/common/types';

import { PriceAlertService } from './price-alert.service';
import {
  RebalancingService,
  toHoldingValuesBySymbol
} from './rebalancing.service';

import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Put,
  UseGuards
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { AlertCondition, DataSource, DcaSignalType, DcaType } from '@prisma/client';

import { InvestmentPlanService } from './investment-plan.service';

@Controller('investment-plan')
export class InvestmentPlanController {
  public constructor(
    private readonly investmentPlanService: InvestmentPlanService,
    private readonly portfolioService: PortfolioService,
    private readonly priceAlertService: PriceAlertService,
    private readonly rebalancingService: RebalancingService,
    @Inject(REQUEST) private readonly request: RequestWithUser
  ) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  public async getPlan() {
    const plan = await this.investmentPlanService.getPlanByUserId(
      this.request.user.id
    );

    let deployedCapital = 0;
    try {
      const { totalInvestmentInBaseCurrency } =
        await this.portfolioService.getAccountsWithAggregations({
          filters: [],
          userId: this.request.user.id,
          withExcludedAccounts: true
        });
      deployedCapital = totalInvestmentInBaseCurrency;
    } catch {
      // ignore if portfolio data is unavailable
    }

    if (!plan) {
      return {
        allocations: [],
        capitalPool: 0,
        cashBuffer: 0,
        cashReserve: 0,
        dcaSchedules: [],
        deployedCapital,
        emailEnabled: false,
        longTermGrowthTarget: 0,
        notifyEmail: null,
        notifyLanguage: 'en',
        preservationBucket: 0,
        priceAlerts: [],
        sipMonthlyBudget: 0,
        subscribeDca: true,
        subscribePriceAlert: true,
        subscribeRebalancing: true,
        webhookEnabled: false,
        webhookUrl: null
      };
    }

    return { ...plan, deployedCapital };
  }

  @Put()
  @UseGuards(AuthGuard('jwt'))
  public async upsertPlan(
    @Body()
    body: {
      capitalPool: number;
      cashBuffer?: number;
      cashReserve?: number;
      deployedCapital?: number;
      emailEnabled?: boolean;
      longTermGrowthTarget?: number;
      notifyEmail?: string;
      notifyLanguage?: string;
      preservationBucket?: number;
      sipMonthlyBudget?: number;
      subscribeDca?: boolean;
      subscribePriceAlert?: boolean;
      subscribeRebalancing?: boolean;
      webhookEnabled?: boolean;
      webhookUrl?: string;
    }
  ) {
    const result = await this.investmentPlanService.upsertPlan(
      this.request.user.id,
      body
    );
    if (body.cashReserve !== undefined) {
      await this.investmentPlanService.syncEmergencyFundToUserSettings(
        this.request.user.id,
        body.cashReserve
      );
    }
    return result;
  }

  @Put('allocation-group')
  @UseGuards(AuthGuard('jwt'))
  public async upsertAllocationGroup(
    @Body()
    body: {
      groupId?: string;
      name?: string;
      rebalanceThreshold?: number;
      symbols: { name?: string; symbol: string }[];
      targetWeight: number;
    }
  ) {
    const plan = await this.getOrCreatePlan();
    return this.investmentPlanService.upsertAllocationGroup(plan.id, body);
  }

  @Delete('allocation-group/:groupId')
  @UseGuards(AuthGuard('jwt'))
  public async deleteAllocationGroup(@Param('groupId') groupId: string) {
    const plan = await this.getOrCreatePlan();
    await this.investmentPlanService.deleteAllocationGroup(plan.id, groupId);
    return { success: true };
  }

  @Post('dca')
  @UseGuards(AuthGuard('jwt'))
  public async createDcaSchedule(
    @Body()
    body: {
      deadlineDay?: number;
      endDate?: string;
      signalType?: DcaSignalType;
      startDate: string;
      symbol: string;
      totalBudget?: number;
      type?: DcaType;
      weeklyBudget: number;
    }
  ) {
    const plan = await this.getOrCreatePlan();
    return this.investmentPlanService.createDcaSchedule(plan.id, {
      deadlineDay: body.deadlineDay ?? 5,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
      signalType: body.signalType ?? DcaSignalType.MA5,
      startDate: new Date(body.startDate),
      symbol: body.symbol,
      totalBudget: body.totalBudget,
      type: body.type ?? DcaType.ADD_POSITION,
      weeklyBudget: body.weeklyBudget
    });
  }

  @Put('dca/:id')
  @UseGuards(AuthGuard('jwt'))
  public async updateDcaSchedule(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>
  ) {
    return this.investmentPlanService.updateDcaSchedule(id, body);
  }

  @Delete('dca/:id')
  @UseGuards(AuthGuard('jwt'))
  public async deleteDcaSchedule(@Param('id') id: string) {
    await this.investmentPlanService.deleteDcaSchedule(id);
    return { success: true };
  }

  @Post('price-alert')
  @UseGuards(AuthGuard('jwt'))
  public async createPriceAlert(
    @Body()
    body: {
      condition: AlertCondition;
      dataSource: DataSource;
      messageTemplate: string;
      name?: string;
      symbol: string;
      targetValue: number;
    }
  ) {
    const plan = await this.getOrCreatePlan();
    return this.priceAlertService.createAlert(plan.id, {
      condition: body.condition,
      dataSource: body.dataSource,
      messageTemplate: body.messageTemplate ?? '',
      name: body.name,
      symbol: body.symbol,
      targetValue: body.targetValue
    });
  }

  @Put('price-alert/:id/rearm')
  @UseGuards(AuthGuard('jwt'))
  public async rearmPriceAlert(@Param('id') id: string) {
    return this.priceAlertService.rearmAlert(id);
  }

  @Put('price-alert/:id')
  @UseGuards(AuthGuard('jwt'))
  public async updatePriceAlert(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>
  ) {
    return this.priceAlertService.updateAlert(id, body);
  }

  @Delete('price-alert/:id')
  @UseGuards(AuthGuard('jwt'))
  public async deletePriceAlert(@Param('id') id: string) {
    await this.priceAlertService.deleteAlert(id);
    return { success: true };
  }

  @Get('signals')
  @UseGuards(AuthGuard('jwt'))
  public async getSignals() {
    const plan = await this.investmentPlanService.getPlanByUserId(
      this.request.user.id
    );
    if (!plan) return { signals: [] };
    return {
      signals: await this.investmentPlanService.getRecentSignals(plan.id)
    };
  }

  @Get('rebalancing')
  @UseGuards(AuthGuard('jwt'))
  public async getRebalancing() {
    const plan = await this.investmentPlanService.getPlanByUserId(
      this.request.user.id
    );
    if (!plan) return { actions: [], hasTriggered: false, totalValue: 0 };

    let holdings: ReturnType<typeof toHoldingValuesBySymbol> = {};
    try {
      const result = await this.portfolioService.getDetails({
        filters: [],
        userId: this.request.user.id,
        withMarkets: false
      });
      holdings = toHoldingValuesBySymbol(result.holdings);
    } catch {
      // return safe empty result if portfolio data is unavailable
    }

    return this.rebalancingService.calculateRebalancing(
      plan.allocations,
      holdings,
      plan.longTermGrowthTarget ?? 0
    );
  }

  @Put('signals/:id/status')
  @UseGuards(AuthGuard('jwt'))
  public async updateSignalStatus(
    @Param('id') id: string,
    @Body() body: { status: 'EXECUTED' | 'DISMISSED' }
  ) {
    return this.investmentPlanService.updateSignalStatus(id, body.status as any);
  }

  private async getOrCreatePlan() {
    const existing = await this.investmentPlanService.getPlanByUserId(
      this.request.user.id
    );
    if (existing) return existing;
    await this.investmentPlanService.upsertPlan(this.request.user.id, {
      capitalPool: 0
    });
    return this.investmentPlanService.getPlanByUserId(this.request.user.id);
  }
}
