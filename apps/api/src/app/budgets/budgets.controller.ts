import { HasPermission } from '@ghostfolio/api/decorators/has-permission.decorator';
import { HasPermissionGuard } from '@ghostfolio/api/guards/has-permission.guard';
import { JwtOrApiKeyAuthGuard } from '@ghostfolio/api/guards/jwt-or-api-key-auth.guard';
import { CreateBudgetDto, UpdateBudgetDto } from '@ghostfolio/common/dtos';
import {
  BudgetResponse,
  BudgetsResponse,
  ExpenseCategoryResponse
} from '@ghostfolio/common/interfaces';
import { permissions } from '@ghostfolio/common/permissions';
import { RequestWithUser } from '@ghostfolio/common/types';

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

import { BudgetsService } from './budgets.service';

@Controller('budgets')
export class BudgetsController {
  public constructor(
    private readonly budgetsService: BudgetsService,
    @Inject(REQUEST) private readonly request: RequestWithUser
  ) {}

  @HasPermission(permissions.createBudget)
  @Post()
  @UseGuards(JwtOrApiKeyAuthGuard, HasPermissionGuard)
  public async createBudget(
    @Body() data: CreateBudgetDto
  ): Promise<BudgetResponse> {
    return this.budgetsService.createBudget({
      data,
      userId: this.request.user.id
    });
  }

  @Delete(':id')
  @HasPermission(permissions.deleteBudget)
  @UseGuards(JwtOrApiKeyAuthGuard, HasPermissionGuard)
  public async deleteBudget(@Param('id') id: string) {
    return this.budgetsService.deleteBudget({
      id,
      userId: this.request.user.id
    });
  }

  @Get()
  @HasPermission(permissions.readBudgets)
  @UseGuards(JwtOrApiKeyAuthGuard, HasPermissionGuard)
  public async getBudgets(
    @Query('month') month: string
  ): Promise<BudgetsResponse> {
    return this.budgetsService.getBudgets({
      month,
      userId: this.request.user.id
    });
  }

  @Get('categories')
  @HasPermission(permissions.readExpenseCategories)
  @UseGuards(JwtOrApiKeyAuthGuard, HasPermissionGuard)
  public async getCategories(): Promise<ExpenseCategoryResponse[]> {
    return this.budgetsService.getCategories({
      userId: this.request.user.id
    });
  }

  @Get(':id')
  @HasPermission(permissions.readBudgets)
  @UseGuards(JwtOrApiKeyAuthGuard, HasPermissionGuard)
  public async getBudget(@Param('id') id: string): Promise<BudgetResponse> {
    return this.budgetsService.getBudget({
      id,
      userId: this.request.user.id
    });
  }

  @Put(':id')
  @HasPermission(permissions.updateBudget)
  @UseGuards(JwtOrApiKeyAuthGuard, HasPermissionGuard)
  public async updateBudget(
    @Param('id') id: string,
    @Body() data: UpdateBudgetDto
  ): Promise<BudgetResponse> {
    return this.budgetsService.updateBudget({
      data,
      id,
      userId: this.request.user.id
    });
  }
}
