import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { DATE_FORMAT, resetHours } from '@ghostfolio/common/helper';
import {
  JournalCalendarDataItem,
  JournalEntryItem,
  JournalStats
} from '@ghostfolio/common/interfaces';

import { Injectable } from '@nestjs/common';
import { JournalEntry } from '@prisma/client';
import { format, parseISO } from 'date-fns';

@Injectable()
export class JournalService {
  public constructor(private readonly prismaService: PrismaService) {}

  public async getJournalEntry({
    date,
    userId
  }: {
    date: Date;
    userId: string;
  }): Promise<JournalEntryItem | null> {
    const entry = await this.prismaService.journalEntry.findUnique({
      where: {
        userId_date: {
          userId,
          date: resetHours(date)
        }
      }
    });

    if (!entry) {
      return null;
    }

    return {
      date: format(entry.date, DATE_FORMAT),
      note: entry.note
    };
  }

  public async getJournalEntries({
    startDate,
    endDate,
    userId
  }: {
    startDate: Date;
    endDate: Date;
    userId: string;
  }): Promise<JournalEntry[]> {
    return this.prismaService.journalEntry.findMany({
      where: {
        userId,
        date: {
          gte: resetHours(startDate),
          lte: resetHours(endDate)
        }
      },
      orderBy: {
        date: 'asc'
      }
    });
  }

  public async createOrUpdateJournalEntry({
    date,
    note,
    userId
  }: {
    date: string;
    note: string;
    userId: string;
  }): Promise<JournalEntry> {
    const parsedDate = resetHours(parseISO(date));

    return this.prismaService.journalEntry.upsert({
      create: {
        date: parsedDate,
        note,
        user: {
          connect: { id: userId }
        }
      },
      update: {
        note
      },
      where: {
        userId_date: {
          userId,
          date: parsedDate
        }
      }
    });
  }

  public async deleteJournalEntry({
    date,
    userId
  }: {
    date: Date;
    userId: string;
  }): Promise<JournalEntry> {
    return this.prismaService.journalEntry.delete({
      where: {
        userId_date: {
          userId,
          date: resetHours(date)
        }
      }
    });
  }

  public buildJournalStats(days: JournalCalendarDataItem[]): JournalStats {
    const tradingDays = days.filter(
      (d) => d.activitiesCount > 0 || d.netPerformance !== 0
    );
    const winningDays = tradingDays.filter((d) => d.netPerformance > 0);
    const losingDays = tradingDays.filter((d) => d.netPerformance < 0);

    const profits = tradingDays.map((d) => d.netPerformance);
    const largestProfit = profits.length > 0 ? Math.max(...profits) : 0;
    const largestLoss = profits.length > 0 ? Math.min(...profits) : 0;

    const averageDailyPnL =
      tradingDays.length > 0
        ? profits.reduce((sum, val) => sum + val, 0) / tradingDays.length
        : 0;

    let maxConsecutiveWins = 0;
    let maxConsecutiveLosses = 0;
    let currentWins = 0;
    let currentLosses = 0;

    for (const day of tradingDays) {
      if (day.netPerformance > 0) {
        currentWins++;
        currentLosses = 0;
        maxConsecutiveWins = Math.max(maxConsecutiveWins, currentWins);
      } else if (day.netPerformance < 0) {
        currentLosses++;
        currentWins = 0;
        maxConsecutiveLosses = Math.max(maxConsecutiveLosses, currentLosses);
      } else {
        currentWins = 0;
        currentLosses = 0;
      }
    }

    return {
      averageDailyPnL,
      largestLoss,
      largestProfit,
      losingDays: losingDays.length,
      maxConsecutiveLosses,
      maxConsecutiveWins,
      totalTradingDays: tradingDays.length,
      winningDays: winningDays.length
    };
  }
}
