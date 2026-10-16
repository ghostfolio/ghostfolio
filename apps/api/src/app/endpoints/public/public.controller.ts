import { RedactValuesInResponseInterceptor } from '@ghostfolio/api/interceptors/redact-values-in-response/redact-values-in-response.interceptor';
import { TransformDataSourceInResponseInterceptor } from '@ghostfolio/api/interceptors/transform-data-source-in-response/transform-data-source-in-response.interceptor';
import { PublicPortfolioResponse } from '@ghostfolio/common/interfaces';

import { Controller, Get, Param, UseInterceptors } from '@nestjs/common';

import { PublicService } from './public.service';

@Controller('public')
export class PublicController {
  public constructor(private readonly publicService: PublicService) {}

  @Get(':accessId/portfolio')
  @UseInterceptors(RedactValuesInResponseInterceptor)
  @UseInterceptors(TransformDataSourceInResponseInterceptor)
  public async getPublicPortfolio(
    @Param('accessId') accessId: string
  ): Promise<PublicPortfolioResponse> {
    return this.publicService.getPublicPortfolio(accessId);
  }
}
