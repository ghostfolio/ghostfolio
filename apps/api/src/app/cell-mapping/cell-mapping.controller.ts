import { HasPermission } from '@ghostfolio/api/decorators/has-permission.decorator';
import { HasPermissionGuard } from '@ghostfolio/api/guards/has-permission.guard';
import { permissions } from '@ghostfolio/common/permissions';
import type { RequestWithUser } from '@ghostfolio/common/types';

import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Put,
  Query,
  UseGuards
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

import { CellMappingService } from './cell-mapping.service';

@Controller('cell-mapping')
export class CellMappingController {
  public constructor(
    private readonly cellMappingService: CellMappingService,
    @Inject(REQUEST) private readonly request: RequestWithUser
  ) {}
}
