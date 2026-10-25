import { HasPermission } from '@ghostfolio/api/decorators/has-permission.decorator';
import { Impersonation } from '@ghostfolio/api/decorators/impersonation.decorator';
import { RequiresScope } from '@ghostfolio/api/decorators/requires-scope.decorator';
import { RedactValuesInResponseInterceptor } from '@ghostfolio/api/interceptors/redact-values-in-response/redact-values-in-response.interceptor';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { CashEventInput } from '@ghostfolio/common/interfaces';
import { permissions } from '@ghostfolio/common/permissions';
import { scopes } from '@ghostfolio/common/scopes';
import type { ImpersonationContext } from '@ghostfolio/common/types';

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseInterceptors
} from '@nestjs/common';

import {
  CashCsvImportDto,
  CashCsvPreviewDto,
  CashMutationDto,
  CashOpeningDto,
  CashPreferencesDto,
  CashRevisionDto
} from './cash-management.dto';
import { CashManagementService } from './cash-management.service';

@Controller('account/:accountId/cash')
@UseInterceptors(RedactValuesInResponseInterceptor)
export class CashManagementController {
  public constructor(
    private readonly cashManagementService: CashManagementService,
    private readonly exchangeRateDataService: ExchangeRateDataService
  ) {}

  @Get()
  @RequiresScope(scopes.accountRead, scopes.portfolioReadValues)
  public async get(
    @Param('accountId') accountId: string,
    @Impersonation() { userId, userSettings }: ImpersonationContext
  ) {
    const snapshot = await this.cashManagementService.get({
      accountId,
      userId
    });
    return {
      ...snapshot,
      exchangeRateToBaseCurrency: this.exchangeRateDataService.toCurrency(
        1,
        snapshot.currency,
        userSettings.baseCurrency
      )
    };
  }

  @Get('export')
  @RequiresScope(scopes.accountRead, scopes.portfolioReadValues)
  public exportCsv(
    @Param('accountId') accountId: string,
    @Impersonation() { userId }: ImpersonationContext
  ) {
    return this.cashManagementService.exportCsv({ accountId, userId });
  }

  @Post('import/preview')
  @HasPermission(permissions.updateAccount)
  @RequiresScope(scopes.accountUpdate, scopes.portfolioReadValues)
  public previewCsv(
    @Param('accountId') accountId: string,
    @Impersonation() { userId }: ImpersonationContext,
    @Body() data: CashCsvPreviewDto
  ) {
    return this.cashManagementService.previewCsv(
      { accountId, userId },
      data.csv,
      data.activityLinks
    );
  }

  @Post('import')
  @HasPermission(permissions.updateAccount)
  @RequiresScope(scopes.accountUpdate, scopes.portfolioReadValues)
  public importCsv(
    @Param('accountId') accountId: string,
    @Impersonation() { userId }: ImpersonationContext,
    @Body() data: CashCsvImportDto
  ) {
    return this.cashManagementService.importCsv({ accountId, userId }, data);
  }

  @Post('open')
  @HasPermission(permissions.updateAccount)
  @RequiresScope(scopes.accountUpdate, scopes.portfolioReadValues)
  public open(
    @Param('accountId') accountId: string,
    @Impersonation() { userId }: ImpersonationContext,
    @Body() data: CashOpeningDto
  ) {
    return this.cashManagementService.open({ ...data, accountId, userId });
  }

  @Post('events')
  @HasPermission(permissions.updateAccount)
  @RequiresScope(scopes.accountUpdate, scopes.portfolioReadValues)
  public create(
    @Param('accountId') accountId: string,
    @Impersonation() { userId }: ImpersonationContext,
    @Body() data: CashMutationDto
  ) {
    return this.cashManagementService.createEvent({
      ...data,
      event: data.event as CashEventInput,
      accountId,
      userId
    });
  }

  @Put('events/:eventId')
  @HasPermission(permissions.updateAccount)
  @RequiresScope(scopes.accountUpdate, scopes.portfolioReadValues)
  public update(
    @Param('accountId') accountId: string,
    @Param('eventId') eventId: string,
    @Impersonation() { userId }: ImpersonationContext,
    @Body() data: CashMutationDto
  ) {
    return this.cashManagementService.updateEvent({
      ...data,
      event: data.event as CashEventInput,
      accountId,
      userId,
      eventId
    });
  }

  @Delete('events/:eventId')
  @HasPermission(permissions.updateAccount)
  @RequiresScope(scopes.accountUpdate, scopes.portfolioReadValues)
  public delete(
    @Param('accountId') accountId: string,
    @Param('eventId') eventId: string,
    @Impersonation() { userId }: ImpersonationContext,
    @Body() data: CashRevisionDto
  ) {
    return this.cashManagementService.deleteEvent({
      ...data,
      accountId,
      userId,
      eventId
    });
  }

  @Put('preferences')
  @HasPermission(permissions.updateAccount)
  @RequiresScope(scopes.accountUpdate, scopes.portfolioReadValues)
  public preferences(
    @Param('accountId') accountId: string,
    @Impersonation() { userId }: ImpersonationContext,
    @Body() data: CashPreferencesDto
  ) {
    return this.cashManagementService.updatePreferences({
      ...data,
      accountId,
      userId
    });
  }
}
