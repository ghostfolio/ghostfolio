import { HasPermission } from '@ghostfolio/api/decorators/has-permission.decorator';
import { HasPermissionGuard } from '@ghostfolio/api/guards/has-permission.guard';
import {
  CreateEntityDto,
  CreateOwnershipDto,
  UpdateEntityDto
} from '@ghostfolio/common/dtos';
import { permissions } from '@ghostfolio/common/permissions';
import type { RequestWithUser } from '@ghostfolio/common/types';

import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Put,
  Query,
  UseGuards
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

import { EntityService } from './entity.service';

@Controller('entity')
export class EntityController {
  public constructor(
    private readonly entityService: EntityService,
    @Inject(REQUEST) private readonly request: RequestWithUser
  ) {}

  @HasPermission(permissions.createEntity)
  @Post()
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async createEntity(@Body() data: CreateEntityDto) {
    return this.entityService.createEntity({
      name: data.name,
      type: data.type as any,
      taxId: data.taxId,
      user: { connect: { id: this.request.user.id } }
    });
  }

  @Get()
  @HasPermission(permissions.readEntity)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async getEntities(@Query('type') type?: string) {
    return this.entityService.getEntities({
      userId: this.request.user.id,
      type
    });
  }

  @Get(':id')
  @HasPermission(permissions.readEntity)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async getEntityById(@Param('id') id: string) {
    return this.entityService.getEntityById({
      entityId: id,
      userId: this.request.user.id
    });
  }

  @HasPermission(permissions.updateEntity)
  @Put(':id')
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async updateEntity(
    @Param('id') id: string,
    @Body() data: UpdateEntityDto
  ) {
    return this.entityService.updateEntity({
      entityId: id,
      userId: this.request.user.id,
      data
    });
  }

  @Delete(':id')
  @HasPermission(permissions.deleteEntity)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async deleteEntity(@Param('id') id: string) {
    return this.entityService.deleteEntity({
      entityId: id,
      userId: this.request.user.id
    });
  }

  @Get(':id/portfolio')
  @HasPermission(permissions.readEntity)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async getEntityPortfolio(@Param('id') id: string) {
    return this.entityService.getEntityPortfolio({
      entityId: id,
      userId: this.request.user.id
    });
  }

  @HasPermission(permissions.createEntity)
  @Post(':id/ownership')
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async createOwnership(
    @Param('id') id: string,
    @Body() data: CreateOwnershipDto
  ) {
    return this.entityService.createOwnership({
      entityId: id,
      userId: this.request.user.id,
      data: {
        accountId: data.accountId,
        ownershipPercent: data.ownershipPercent,
        effectiveDate: data.effectiveDate,
        acquisitionDate: data.acquisitionDate,
        costBasis: data.costBasis
      }
    });
  }

  @Get(':id/distributions')
  @HasPermission(permissions.readDistribution)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async getEntityDistributions(@Param('id') id: string) {
    return this.entityService.getEntityDistributions({
      entityId: id,
      userId: this.request.user.id
    });
  }

  @Get(':id/k-documents')
  @HasPermission(permissions.readKDocument)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async getEntityKDocuments(@Param('id') id: string) {
    return this.entityService.getEntityKDocuments({
      entityId: id,
      userId: this.request.user.id
    });
  }
}
