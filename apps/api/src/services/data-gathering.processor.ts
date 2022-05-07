import {
  DATA_GATHERING_QUEUE,
  GATHER_ASSET_PROFILE_PROCESS
} from '@ghostfolio/common/config';
import { UniqueAsset } from '@ghostfolio/common/interfaces';
import { Process, Processor } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bull';

import { DataGatheringService } from './data-gathering.service';

@Injectable()
@Processor(DATA_GATHERING_QUEUE)
export class DataGatheringProcessor {
  public constructor(
    private readonly dataGatheringService: DataGatheringService
  ) {}

  @Process(GATHER_ASSET_PROFILE_PROCESS)
  public async gatherAssetProfile(job: Job<UniqueAsset>) {
    try {
      await this.dataGatheringService.gatherAssetProfiles([job.data]);
    } catch (error) {
      Logger.error(error, 'DataGatheringProcessor');
    }
  }
}
