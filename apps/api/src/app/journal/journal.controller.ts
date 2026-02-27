import { OrderService } from '@ghostfolio/api/app/order/order.service';
import { PortfolioService } from '@ghostfolio/api/app/portfolio/portfolio.service';
import { HasPermission } from '@ghostfolio/api/decorators/has-permission.decorator';
import { HasPermissionGuard } from '@ghostfolio/api/guards/has-permission.guard';
import { DEFAULT_CURRENCY } from '@ghostfolio/common/config';
import { CreateOrUpdateJournalEntryDto } from '@ghostfolio/common/dtos';
import { DATE_FORMAT, resetHours } from '@ghostfolio/common/helper';
import {
  JournalCalendarDataItem,
  JournalResponse
} from '@ghostfolio/common/interfaces';
import { permissions } from '@ghostfolio/common/permissions';
import type { RequestWithUser } from '@ghostfolio/common/types';

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  Inject,
  Param,
  Put,
  Query,
  UseGuards
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import {
  endOfMonth,
  format,
  parseISO,
  startOfMonth,
  subMonths
} from 'date-fns';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';

import { JournalService } from './journal.service';

@Controller('journal')
export class JournalController {
  public constructor(
    private readonly journalService: JournalService,
    private readonly orderService: OrderService,
    private readonly portfolioService: PortfolioService,
    @Inject(REQUEST) private readonly request: RequestWithUser
  ) {}

  @Get()
  @HasPermission(permissions.readJournalEntry)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async getJournal(
    @Query('month') month: string,
    @Query('year') year: string
  ): Promise<JournalResponse> {
    const userId = this.request.user.id;
    const monthNum = parseInt(month, 10) - 1;
    const yearNum = parseInt(year, 10);

    if (
      isNaN(monthNum) ||
      isNaN(yearNum) ||
      monthNum < 0 ||
      monthNum > 11 ||
      yearNum < 1970 ||
      yearNum > 2100
    ) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.BAD_REQUEST),
        StatusCodes.BAD_REQUEST
      );
    }

    const userCurrency =
      this.request.user.settings?.settings?.baseCurrency ?? DEFAULT_CURRENCY;

    const startDate = startOfMonth(new Date(yearNum, monthNum));
    const endDate = endOfMonth(new Date(yearNum, monthNum));

    // Fetch performance with a baseline that includes the previous month's
    // last day, so January deltas are computed correctly
    const performanceFetchStart = subMonths(startDate, 1);
    const performanceYear = performanceFetchStart.getFullYear();

    const [journalEntries, performanceResponse, activitiesResponse] =
      await Promise.all([
        this.journalService.getJournalEntries({
          startDate,
          endDate,
          userId
        }),
        this.portfolioService.getPerformance({
          dateRange:
            `${performanceYear}` === `${yearNum}` ? `${yearNum}` : 'max',
          filters: [],
          impersonationId: undefined,
          userId
        }),
        this.orderService.getOrders({
          endDate,
          userId,
          userCurrency,
          includeDrafts: false,
          startDate: startDate,
          withExcludedAccountsAndActivities: false
        })
      ]);

    const chart = performanceResponse?.chart ?? [];
    const activities = activitiesResponse?.activities ?? [];

    const daysMap = new Map<string, JournalCalendarDataItem>();

    // Build days from performance chart data
    for (const item of chart) {
      const itemDate = parseISO(item.date);

      if (itemDate >= startDate && itemDate <= endDate) {
        daysMap.set(item.date, {
          activitiesCount: 0,
          date: item.date,
          hasNote: false,
          netPerformance: item.netPerformance ?? 0,
          netPerformanceInPercentage: item.netPerformanceInPercentage ?? 0,
          realizedProfit: 0,
          value: item.value ?? 0
        });
      }
    }

    // Calculate daily performance deltas (both absolute and percentage)
    const sortedDates = Array.from(daysMap.keys()).sort();
    let previousNetPerformance = 0;
    let previousNetPerformanceInPercentage = 0;

    // Find the chart item just before our month starts to get the baseline
    for (const item of chart) {
      const itemDate = parseISO(item.date);
      if (itemDate < startDate) {
        previousNetPerformance = item.netPerformance ?? 0;
        previousNetPerformanceInPercentage =
          item.netPerformanceInPercentage ?? 0;
      }
    }

    for (const dateKey of sortedDates) {
      const day = daysMap.get(dateKey);

      const currentNetPerformance = day.netPerformance;
      day.netPerformance = currentNetPerformance - previousNetPerformance;
      previousNetPerformance = currentNetPerformance;

      const currentNetPerformanceInPercentage = day.netPerformanceInPercentage;
      day.netPerformanceInPercentage =
        currentNetPerformanceInPercentage - previousNetPerformanceInPercentage;
      previousNetPerformanceInPercentage = currentNetPerformanceInPercentage;
    }

    // Count activities per day and track dividend/interest income
    for (const activity of activities) {
      const dateKey = format(activity.date, DATE_FORMAT);
      let day = daysMap.get(dateKey);

      if (!day) {
        day = {
          activitiesCount: 0,
          date: dateKey,
          hasNote: false,
          netPerformance: 0,
          netPerformanceInPercentage: 0,
          realizedProfit: 0,
          value: 0
        };
        daysMap.set(dateKey, day);
      }

      day.activitiesCount++;

      // Track dividend and interest income as realized profit.
      // SELL activities use gross proceeds (not actual realized gain),
      // so we exclude them to avoid misleading values.
      if (activity.type === 'DIVIDEND' || activity.type === 'INTEREST') {
        day.realizedProfit +=
          activity.valueInBaseCurrency ?? activity.value ?? 0;
      }
    }

    // Mark days with journal notes
    for (const entry of journalEntries) {
      const dateKey = format(entry.date, DATE_FORMAT);
      const day = daysMap.get(dateKey);

      if (day) {
        day.hasNote = true;
      }
    }

    const days = Array.from(daysMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    const stats = this.journalService.buildJournalStats(days);

    return { days, stats };
  }

  @Get(':date')
  @HasPermission(permissions.readJournalEntry)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async getJournalEntry(@Param('date') dateString: string) {
    const userId = this.request.user.id;
    const date = resetHours(parseISO(dateString));

    return this.journalService.getJournalEntry({ date, userId });
  }

  @HasPermission(permissions.createJournalEntry)
  @Put(':date')
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async createOrUpdateJournalEntry(
    @Param('date') dateString: string,
    @Body() data: CreateOrUpdateJournalEntryDto
  ) {
    const userId = this.request.user.id;

    return this.journalService.createOrUpdateJournalEntry({
      date: dateString,
      note: data.note,
      userId
    });
  }

  @HasPermission(permissions.deleteJournalEntry)
  @Delete(':date')
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async deleteJournalEntry(@Param('date') dateString: string) {
    const userId = this.request.user.id;
    const date = resetHours(parseISO(dateString));

    try {
      return await this.journalService.deleteJournalEntry({ date, userId });
    } catch {
      throw new HttpException(
        getReasonPhrase(StatusCodes.NOT_FOUND),
        StatusCodes.NOT_FOUND
      );
    }
  }
}
