import { HasPermission } from '@ghostfolio/api/decorators/has-permission.decorator';
import { HasPermissionGuard } from '@ghostfolio/api/guards/has-permission.guard';
import { TagService } from '@ghostfolio/api/services/tag/tag.service';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { RequestWithUser } from '@ghostfolio/common/types';

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  Inject,
  Param,
  Post,
  Put,
  UseGuards
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Tag } from '@prisma/client';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';

import { CreateTagDto } from './create-tag.dto';
import { UpdateTagDto } from './update-tag.dto';

@Controller('tags')
export class TagsController {
  public constructor(
    @Inject(REQUEST) private readonly request: RequestWithUser,
    private readonly tagService: TagService
  ) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  public async createTag(@Body() data: CreateTagDto): Promise<Tag> {
    const canCreateOwnTag = hasPermission(
      this.request.user.permissions,
      permissions.createOwnTag
    );

    const canCreateTag = hasPermission(
      this.request.user.permissions,
      permissions.createTag
    );

    if (!canCreateOwnTag && !canCreateTag) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    if (canCreateOwnTag && !canCreateTag) {
      if (data.userId !== this.request.user.id) {
        throw new HttpException(
          getReasonPhrase(StatusCodes.BAD_REQUEST),
          StatusCodes.BAD_REQUEST
        );
      }
    }

    return this.tagService.createTag(data);
  }

  @Delete(':id')
  @HasPermission(permissions.deleteTag)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async deleteTag(@Param('id') id: string) {
    const originalTag = await this.tagService.getTag({
      id
    });

    if (!originalTag) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    return this.tagService.deleteTag({ id });
  }

  @Get()
  @HasPermission(permissions.readTags)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async getTags() {
    return this.tagService.getTagsWithActivityCount();
  }

  @HasPermission(permissions.updateTag)
  @Put(':id')
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async updateTag(@Param('id') id: string, @Body() data: UpdateTagDto) {
    const originalTag = await this.tagService.getTag({
      id
    });

    if (!originalTag) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    return this.tagService.updateTag({
      data: {
        ...data
      },
      where: {
        id
      }
    });
  }
}
