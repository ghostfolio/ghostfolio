import { Controller, Get } from '@nestjs/common';

import { ImportAuditorService } from './import-auditor.service';

@Controller('import-auditor')
export class ImportAuditorController {
  public constructor(
    private readonly importAuditorService: ImportAuditorService
  ) {}

  @Get('health')
  public getHealth(): { status: string } {
    return this.importAuditorService.getHealth();
  }
}
