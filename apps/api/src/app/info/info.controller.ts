import { Controller, Get } from '@nestjs/common';

import { InfoService } from './info.service';
import { InfoItem } from './interfaces/info-item.interface';

@Controller('info')
export class InfoController {
  public constructor(private readonly infoService: InfoService) {}

  @Get()
  public async getInfo(): Promise<InfoItem> {
    return this.infoService.get();
  }
}
