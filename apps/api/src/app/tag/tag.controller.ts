import { HasPermission } from '@ghostfolio/api/decorators/has-permission.decorator';
import { HasPermissionGuard } from '@ghostfolio/api/guards/has-permission.guard';
import { permissions } from '@ghostfolio/common/permissions';

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  Param,
  Post,
  Put,
  UseGuards
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Tag } from '@prisma/client';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';

import { CreateTagDto } from './create-tag.dto';
import { TagService } from './tag.service';
import { UpdateTagDto } from './update-tag.dto';

@Controller('tag')
export class TagController {
  public constructor(private readonly tagService: TagService) {}

  @Get()
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async getTags() {
    return this.tagService.getTagsWithActivityCount();
  }

  @Post()
  @HasPermission(permissions.createTag)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async createTag(@Body() data: CreateTagDto): Promise<Tag> {
    return this.tagService.createTag(data);
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
}
