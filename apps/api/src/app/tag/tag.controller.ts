import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import type { RequestWithUser } from '@ghostfolio/common/types';
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
import { TagService } from './tag.service';
import { UpdateTagDto } from './update-tag.dto';

@Controller('tag')
export class TagController {
  public constructor(
    @Inject(REQUEST) private readonly request: RequestWithUser,
    private readonly tagService: TagService
  ) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  public async getTags() {
    return this.tagService.getTagsWithActivityCount();
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  public async createTag(@Body() data: CreateTagDto): Promise<Tag> {
    if (!hasPermission(this.request.user.permissions, permissions.createTag)) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    return this.tagService.createTag(data);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'))
  public async updateTag(@Param('id') id: string, @Body() data: UpdateTagDto) {
    if (!hasPermission(this.request.user.permissions, permissions.updateTag)) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

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

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  public async deleteTag(@Param('id') id: string) {
    if (!hasPermission(this.request.user.permissions, permissions.deleteTag)) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

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
}
