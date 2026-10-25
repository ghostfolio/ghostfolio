import { HasPermission } from '@ghostfolio/api/decorators/has-permission.decorator';
import { RequiresScope } from '@ghostfolio/api/decorators/requires-scope.decorator';
import { TransformDataSourceInRequestInterceptor } from '@ghostfolio/api/interceptors/transform-data-source-in-request/transform-data-source-in-request.interceptor';
import { PortfolioRestoreDto } from '@ghostfolio/api/services/import/portfolio-restore.dto';
import { PortfolioRestoreService } from '@ghostfolio/api/services/import/portfolio-restore.service';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { scopes } from '@ghostfolio/common/scopes';
import type { RequestWithUser } from '@ghostfolio/common/types';

import {
  Body,
  Controller,
  ForbiddenException,
  Inject,
  Post,
  UseInterceptors
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';

@Controller('import/restore')
@UseInterceptors(TransformDataSourceInRequestInterceptor)
export class PortfolioRestoreController {
  constructor(
    private readonly service: PortfolioRestoreService,
    @Inject(REQUEST) private readonly request: RequestWithUser
  ) {}
  @RequiresScope(
    scopes.accountCreate,
    scopes.activityCreate,
    scopes.accountUpdate,
    scopes.portfolioReadValues
  )
  @Post('preview')
  @HasPermission(permissions.createActivity)
  preview(@Body() input: PortfolioRestoreDto) {
    return this.run(input, true);
  }
  @RequiresScope(
    scopes.accountCreate,
    scopes.activityCreate,
    scopes.accountUpdate,
    scopes.portfolioReadValues
  )
  @Post()
  @HasPermission(permissions.createActivity)
  restore(@Body() input: PortfolioRestoreDto) {
    return this.run(input, false);
  }
  private run(input: PortfolioRestoreDto, preview: boolean) {
    if (
      !hasPermission(this.request.user.permissions, permissions.createAccount)
    )
      throw new ForbiddenException();
    if (
      this.request.impersonation?.isActive ||
      this.request.user.settings?.settings?.isRestrictedView
    ) {
      throw new ForbiddenException(
        'Restore data only from your own unrestricted profile.'
      );
    }
    return this.service.run(input, this.request.user.id, preview);
  }
}
