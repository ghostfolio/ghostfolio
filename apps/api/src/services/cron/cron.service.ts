import { DcaSignalService } from '@ghostfolio/api/app/investment-plan/dca-signal.service';
import { InvestmentPlanService } from '@ghostfolio/api/app/investment-plan/investment-plan.service';
import { PriceAlertService } from '@ghostfolio/api/app/investment-plan/price-alert.service';
import {
  RebalancingService,
  toHoldingValuesBySymbol
} from '@ghostfolio/api/app/investment-plan/rebalancing.service';
import { PortfolioService } from '@ghostfolio/api/app/portfolio/portfolio.service';
import { UserService } from '@ghostfolio/api/app/user/user.service';
import { MailService } from '@ghostfolio/api/services/mail/mail.service';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { PropertyService } from '@ghostfolio/api/services/property/property.service';
import { DataGatheringService } from '@ghostfolio/api/services/queues/data-gathering/data-gathering.service';
import { StatisticsGatheringService } from '@ghostfolio/api/services/queues/statistics-gathering/statistics-gathering.service';
import { TwitterBotService } from '@ghostfolio/api/services/twitter-bot/twitter-bot.service';
import {
  DATA_GATHERING_QUEUE_PRIORITY_LOW,
  GATHER_ASSET_PROFILE_PROCESS_JOB_NAME,
  GATHER_ASSET_PROFILE_PROCESS_JOB_OPTIONS,
  PROPERTY_IS_DATA_GATHERING_ENABLED
} from '@ghostfolio/common/config';
import { getAssetProfileIdentifier } from '@ghostfolio/common/helper';
import type { RequestWithUser } from '@ghostfolio/common/types';

import { Injectable } from '@nestjs/common';
import { ContextIdFactory, ModuleRef } from '@nestjs/core';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class CronService {
  private static readonly EVERY_HOUR_AT_RANDOM_MINUTE = `${new Date().getMinutes()} * * * *`;
  private static readonly EVERY_SUNDAY_AT_LUNCH_TIME = '0 12 * * 0';

  public constructor(
    private readonly configurationService: ConfigurationService,
    private readonly dataGatheringService: DataGatheringService,
    private readonly dcaSignalService: DcaSignalService,
    private readonly investmentPlanService: InvestmentPlanService,
    private readonly moduleRef: ModuleRef,
    private readonly priceAlertService: PriceAlertService,
    private readonly propertyService: PropertyService,
    private readonly rebalancingService: RebalancingService,
    private readonly statisticsGatheringService: StatisticsGatheringService,
    private readonly twitterBotService: TwitterBotService,
    private readonly userService: UserService
  ) {}

  /**
   * PortfolioService is request-scoped (it injects REQUEST). Injecting it
   * directly into CronService's (or PriceAlertService's) constructor makes the
   * whole dependency tree request-scoped, which silently breaks ALL @Cron
   * registrations on this class (Nest logs "Cannot register cron job ...
   * non static provider").
   * Resolve a fresh instance per cron run instead, backed by a real user
   * fetched from the DB (same shape the JwtStrategy would attach to a
   * request), so any internal `this.request.user...` lookups work.
   */
  private async resolveRequestScoped<T>(type: new (...args: any[]) => T, userId: string): Promise<T> {
    const user = await this.userService.user({ id: userId });
    const contextId = ContextIdFactory.create();
    this.moduleRef.registerRequestByContextId(
      { user } as RequestWithUser,
      contextId
    );
    return this.moduleRef.resolve(type, contextId, { strict: false });
  }

  @Cron(CronExpression.EVERY_HOUR)
  public async runEveryHour() {
    if (this.configurationService.get('ENABLE_FEATURE_STATISTICS')) {
      await this.statisticsGatheringService.addJobsToQueue();
    }
  }

  @Cron(CronService.EVERY_HOUR_AT_RANDOM_MINUTE)
  public async runEveryHourAtRandomMinute() {
    if (await this.isDataGatheringEnabled()) {
      await this.dataGatheringService.gatherHourlyMarketData();
      await this.dataGatheringService.gatherRecentMarketData();
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_5PM)
  public async runEveryDayAtFivePm() {
    if (this.configurationService.get('ENABLE_FEATURE_SUBSCRIPTION')) {
      this.twitterBotService.tweetFearAndGreedIndex();
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  public async runEveryDayAtMidnight() {
    if (this.configurationService.get('ENABLE_FEATURE_SUBSCRIPTION')) {
      this.userService.resetAnalytics();
    }
  }

  @Cron(CronService.EVERY_SUNDAY_AT_LUNCH_TIME)
  public async runEverySundayAtTwelvePm() {
    if (await this.isDataGatheringEnabled()) {
      const assetProfileIdentifiers =
        await this.dataGatheringService.getActiveAssetProfileIdentifiers({
          maxAge: '60 days'
        });

      await this.dataGatheringService.addJobsToQueue(
        assetProfileIdentifiers.map(({ dataSource, symbol }) => {
          return {
            data: {
              dataSource,
              symbol
            },
            name: GATHER_ASSET_PROFILE_PROCESS_JOB_NAME,
            opts: {
              ...GATHER_ASSET_PROFILE_PROCESS_JOB_OPTIONS,
              jobId: getAssetProfileIdentifier({ dataSource, symbol }),
              priority: DATA_GATHERING_QUEUE_PRIORITY_LOW
            }
          };
        })
      );
    }
  }

  @Cron('0 9 * * 1-5')
  public async runInvestmentSignals() {
    const plans = await this.investmentPlanService.getAllActivePlans();

    for (const plan of plans) {
      // 1. Generate DCA signals — generation is channel-agnostic, the delivery
      //    step below decides whether they go out by email, webhook or both
      if (plan.subscribeDca && plan.dcaSchedules?.length > 0) {
        await this.dcaSignalService.generateSignalsForPlan(plan.id, plan.dcaSchedules);
      }

      // 2. Generate Rebalancing signals (at most once per week, deduped in service)
      if (plan.subscribeRebalancing && plan.allocations?.length > 0) {
        try {
          const portfolioService = await this.resolveRequestScoped(PortfolioService, plan.userId);
          const { holdings } = await portfolioService.getDetails({
            filters: [],
            userId: plan.userId,
            withMarkets: false
          });
          await this.rebalancingService.generateRebalancingSignals(
            plan.id,
            plan.allocations,
            toHoldingValuesBySymbol(holdings),
            plan.longTermGrowthTarget ?? 0
          );
        } catch {
          // ignore if portfolio data unavailable for this user
        }
      }

      // 3. Send email / webhook with all pending actionable signals
      if ((plan.emailEnabled && plan.notifyEmail) || (plan.webhookEnabled && plan.webhookUrl)) {
        const signals = await this.investmentPlanService.getPendingSignals(plan.id);
        const actionableSignals = signals.filter((s) => {
          if (s.type === 'DCA_WAIT' || s.emailSent) {
            return false;
          }
          if (s.type === 'DCA_BUY') {
            return plan.subscribeDca;
          }
          if (s.type === 'REBALANCE_BUY' || s.type === 'REBALANCE_SELL') {
            return plan.subscribeRebalancing;
          }
          return true;
        });

        if (actionableSignals.length > 0) {
          let emailSent = false;
          if (plan.emailEnabled && plan.notifyEmail) {
            const mailService = this.moduleRef.get(MailService, { strict: false });
            const user = await this.userService.user({ id: plan.userId });

            emailSent = await mailService.sendInvestmentSignalEmail(
              plan.notifyEmail,
              actionableSignals,
              user?.settings?.settings?.language
            );
          }

          let webhookSent = false;
          if (plan.webhookEnabled && plan.webhookUrl) {
            webhookSent = await this.investmentPlanService.sendWebhook(plan.webhookUrl, {
              event: 'investment_signals',
              planId: plan.id,
              signals: actionableSignals
            });
          }

          if (emailSent || webhookSent) {
            await this.investmentPlanService.markSignalsEmailSent(
              actionableSignals.map((s) => s.id)
            );
          }
        }
      }
    }
  }

  @Cron('*/10 * * * *')
  public async runPriceAlertsCheck() {
    const plans = await this.investmentPlanService.getAllActivePlans();

    if (plans.length === 0) {
      return;
    }

    const mailService = this.moduleRef.get(MailService, { strict: false });
    await this.priceAlertService.checkAndTriggerAlertsForPlans(plans, mailService);
  }

  private async isDataGatheringEnabled() {
    return (await this.propertyService.getByKey(
      PROPERTY_IS_DATA_GATHERING_ENABLED
    )) === false
      ? false
      : true;
  }
}
