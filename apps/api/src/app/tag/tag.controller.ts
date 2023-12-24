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
import { HasPermission } from '@ghostfolio/api/decorators/has-permission.decorator';

@Controller('tag')
export class TagController {
  public constructor(private readonly tagService: TagService) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  public async getTags() {
    return this.tagService.getTagsWithActivityCount();
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @HasPermission(permissions.createTag)
  public async createTag(@Body() data: CreateTagDto): Promise<Tag> {
    return this.tagService.createTag(data);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'))
  @HasPermission(permissions.updateTag)
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
  @UseGuards(AuthGuard('jwt'))
  @HasPermission(permissions.deleteTag)
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
