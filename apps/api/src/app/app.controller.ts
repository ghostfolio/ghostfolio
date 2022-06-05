import { DataGatheringService } from '@ghostfolio/api/services/data-gathering.service';
import { Controller } from '@nestjs/common';

@Controller()
export class AppController {
  public constructor(
    private readonly dataGatheringService: DataGatheringService
  ) {
    this.initialize();
  }

  private async initialize() {
    const isDataGatheringInProgress =
      await this.dataGatheringService.getIsInProgress();

    if (isDataGatheringInProgress) {
      // Prepare for automatical data gathering, if hung up in progress state
      await this.dataGatheringService.reset();
    }
  }
}
