import { HasPermission } from '@ghostfolio/api/decorators/has-permission.decorator';
import { HasPermissionGuard } from '@ghostfolio/api/guards/has-permission.guard';
import { ApiKeyService } from '@ghostfolio/api/services/api-key/api-key.service';
import { ApiKeyResponse } from '@ghostfolio/common/interfaces';
import { permissions } from '@ghostfolio/common/permissions';
import type { RequestWithUser } from '@ghostfolio/common/types';

import { Controller, Inject, Post, UseGuards } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

@Controller('api-keys')
export class ApiKeysController {
  public constructor(
    private readonly apiKeyService: ApiKeyService,
    @Inject(REQUEST) private readonly request: RequestWithUser
  ) {}

  @HasPermission(permissions.createApiKey)
  @Post()
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async createApiKey(): Promise<ApiKeyResponse> {
    return this.apiKeyService.create({ userId: this.request.user.id });
  }
}
