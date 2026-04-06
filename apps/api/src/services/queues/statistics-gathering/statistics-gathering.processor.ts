import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { PropertyService } from '@ghostfolio/api/services/property/property.service';
import {
  GATHER_STATISTICS_DOCKER_HUB_PULLS_PROCESS_JOB_NAME,
  GATHER_STATISTICS_GITHUB_CONTRIBUTORS_PROCESS_JOB_NAME,
  GATHER_STATISTICS_GITHUB_STARGAZERS_PROCESS_JOB_NAME,
  GATHER_STATISTICS_UPTIME_PROCESS_JOB_NAME,
  HEADER_KEY_TOKEN,
  PROPERTY_BETTER_UPTIME_MONITOR_ID,
  PROPERTY_DOCKER_HUB_PULLS,
  PROPERTY_GITHUB_CONTRIBUTORS,
  PROPERTY_GITHUB_STARGAZERS,
  PROPERTY_UPTIME,
  STATISTICS_GATHERING_QUEUE
} from '@ghostfolio/common/config';
import {
  DATE_FORMAT,
  extractNumberFromString
} from '@ghostfolio/common/helper';

import { Process, Processor } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { format, subDays } from 'date-fns';

@Injectable()
@Processor(STATISTICS_GATHERING_QUEUE)
export class StatisticsGatheringProcessor {
  public constructor(
    private readonly configurationService: ConfigurationService,
    private readonly propertyService: PropertyService
  ) {}

  @Process(GATHER_STATISTICS_DOCKER_HUB_PULLS_PROCESS_JOB_NAME)
  public async gatherDockerHubPullsStatistics() {
    Logger.log(
      'Docker Hub pulls statistics gathering has been started',
      'StatisticsGatheringProcessor'
    );

    const dockerHubPulls = await this.countDockerHubPulls();

    await this.propertyService.put({
      key: PROPERTY_DOCKER_HUB_PULLS,
      value: String(dockerHubPulls)
    });

    Logger.log(
      'Docker Hub pulls statistics gathering has been completed',
      'StatisticsGatheringProcessor'
    );
  }

  @Process(GATHER_STATISTICS_GITHUB_CONTRIBUTORS_PROCESS_JOB_NAME)
  public async gatherGitHubContributorsStatistics() {
    Logger.log(
      'GitHub contributors statistics gathering has been started',
      'StatisticsGatheringProcessor'
    );

    const gitHubContributors = await this.countGitHubContributors();

    await this.propertyService.put({
      key: PROPERTY_GITHUB_CONTRIBUTORS,
      value: String(gitHubContributors)
    });

    Logger.log(
      'GitHub contributors statistics gathering has been completed',
      'StatisticsGatheringProcessor'
    );
  }

  @Process(GATHER_STATISTICS_GITHUB_STARGAZERS_PROCESS_JOB_NAME)
  public async gatherGitHubStargazersStatistics() {
    Logger.log(
      'GitHub stargazers statistics gathering has been started',
      'StatisticsGatheringProcessor'
    );

    const gitHubStargazers = await this.countGitHubStargazers();

    await this.propertyService.put({
      key: PROPERTY_GITHUB_STARGAZERS,
      value: String(gitHubStargazers)
    });

    Logger.log(
      'GitHub stargazers statistics gathering has been completed',
      'StatisticsGatheringProcessor'
    );
  }

  @Process(GATHER_STATISTICS_UPTIME_PROCESS_JOB_NAME)
  public async gatherUptimeStatistics() {
    Logger.log(
      'Uptime statistics gathering has been started',
      'StatisticsGatheringProcessor'
    );

    const uptime = await this.getUptime();

    await this.propertyService.put({
      key: PROPERTY_UPTIME,
      value: String(uptime)
    });

    Logger.log(
      'Uptime statistics gathering has been completed',
      'StatisticsGatheringProcessor'
    );
  }

  private async countDockerHubPulls(): Promise<number> {
    try {
      const { pull_count } = (await fetch(
        'https://hub.docker.com/v2/repositories/ghostfolio/ghostfolio',
        {
          headers: { 'User-Agent': 'request' },
          signal: AbortSignal.timeout(
            this.configurationService.get('REQUEST_TIMEOUT')
          )
        }
      ).then((res) => res.json())) as { pull_count: number };

      return pull_count;
    } catch (error) {
      Logger.error(error, 'StatisticsGatheringProcessor - DockerHub');

      throw error;
    }
  }

  private async countGitHubContributors(): Promise<number> {
    try {
      const body = await fetch('https://github.com/ghostfolio/ghostfolio', {
        signal: AbortSignal.timeout(
          this.configurationService.get('REQUEST_TIMEOUT')
        )
      }).then((res) => res.text());

      const $ = cheerio.load(body);

      const value = $(
        'a[href="/ghostfolio/ghostfolio/graphs/contributors"] .Counter'
      ).text();

      if (!value) {
        throw new Error(
          'Could not find the number of contributors in the page'
        );
      }

      return extractNumberFromString({
        value
      });
    } catch (error) {
      Logger.error(error, 'StatisticsGatheringProcessor - GitHub');

      throw error;
    }
  }

  private async countGitHubStargazers(): Promise<number> {
    try {
      const { stargazers_count } = (await fetch(
        'https://api.github.com/repos/ghostfolio/ghostfolio',
        {
          headers: { 'User-Agent': 'request' },
          signal: AbortSignal.timeout(
            this.configurationService.get('REQUEST_TIMEOUT')
          )
        }
      ).then((res) => res.json())) as { stargazers_count: number };

      return stargazers_count;
    } catch (error) {
      Logger.error(error, 'StatisticsGatheringProcessor - GitHub');

      throw error;
    }
  }

  private async getUptime(): Promise<number> {
    try {
      const monitorId = await this.propertyService.getByKey<string>(
        PROPERTY_BETTER_UPTIME_MONITOR_ID
      );

      const { data } = await fetch(
        `https://uptime.betterstack.com/api/v2/monitors/${monitorId}/sla?from=${format(
          subDays(new Date(), 90),
          DATE_FORMAT
        )}&to${format(new Date(), DATE_FORMAT)}`,
        {
          headers: {
            [HEADER_KEY_TOKEN]: `Bearer ${this.configurationService.get(
              'API_KEY_BETTER_UPTIME'
            )}`
          },
          signal: AbortSignal.timeout(
            this.configurationService.get('REQUEST_TIMEOUT')
          )
        }
      ).then((res) => res.json());

      return data.attributes.availability / 100;
    } catch (error) {
      Logger.error(error, 'StatisticsGatheringProcessor - Better Stack');

      throw error;
    }
  }
}
