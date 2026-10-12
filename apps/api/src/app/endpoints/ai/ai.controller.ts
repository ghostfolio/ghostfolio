import { HasPermission } from '@ghostfolio/api/decorators/has-permission.decorator';
import { Impersonation } from '@ghostfolio/api/decorators/impersonation.decorator';
import { RequiresScope } from '@ghostfolio/api/decorators/requires-scope.decorator';
import { FilterDto } from '@ghostfolio/api/dtos/filter.dto';
import { CallerFacingError } from '@ghostfolio/api/errors/caller-facing.error';
import { CustomThrottlerGuard } from '@ghostfolio/api/guards/custom-throttler.guard';
import { HasPermissionGuard } from '@ghostfolio/api/guards/has-permission.guard';
import { TransformDataSourceInRequestInterceptor } from '@ghostfolio/api/interceptors/transform-data-source-in-request/transform-data-source-in-request.interceptor';
import { ApiService } from '@ghostfolio/api/services/api/api.service';
import {
  AI_ACTIVITIES_FILE_MAXIMUM_SIZE,
  AI_ACTIVITIES_TIMEOUT,
  AI_MAX_ACTIVITIES,
  THROTTLE_AI_ACTIVITIES_LIMIT,
  THROTTLE_AI_ACTIVITIES_TTL
} from '@ghostfolio/common/config';
import {
  AiActivitiesResponse,
  AiPromptResponse
} from '@ghostfolio/common/interfaces';
import { permissions } from '@ghostfolio/common/permissions';
import { scopes } from '@ghostfolio/common/scopes';
import type {
  AiPromptMode,
  ImpersonationContext,
  RequestWithUser
} from '@ghostfolio/common/types';

import {
  Controller,
  Get,
  HttpCode,
  HttpException,
  Inject,
  Logger,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { getReasonPhrase, StatusCodes } from 'http-status-codes';

import {
  getDataRowCountOfCsvFile,
  getMediaTypeOfActivityFile
} from './ai.helper';
import { AiService } from './ai.service';

@Controller('ai')
export class AiController {
  private readonly logger = new Logger(AiController.name);

  public constructor(
    private readonly aiService: AiService,
    private readonly apiService: ApiService,
    @Inject(REQUEST) private readonly request: RequestWithUser
  ) {}

  /**
   * Reads the activities of a CSV, JPEG, PDF or PNG file with Ghostfolio AI,
   * without saving anything. The client imports the activities which the user
   * selects with POST api/v1/import. The weekly limit applies to each user
   * instead of each IP address. The models stop if the client closes the
   * request before the response or at the timeout. An error whose message is
   * written for the caller gives the status 400 with this message, the
   * timeout gives the status 400 with a message for the caller as well.
   */
  @HasPermission(permissions.enableGhostfolioAi)
  @HttpCode(StatusCodes.OK)
  @Post('activities')
  @Throttle({
    default: {
      getTracker: ({ user }: RequestWithUser) => {
        return user.id;
      },
      limit: THROTTLE_AI_ACTIVITIES_LIMIT,
      ttl: THROTTLE_AI_ACTIVITIES_TTL
    }
  })
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard, CustomThrottlerGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      defParamCharset: 'utf8',
      limits: { fileSize: AI_ACTIVITIES_FILE_MAXIMUM_SIZE }
    })
  )
  public async getActivitiesFromFile(
    @Res({ passthrough: true }) response: Response,
    @UploadedFile() file?: { buffer: Buffer; originalname: string }
  ): Promise<AiActivitiesResponse> {
    const mediaType = file
      ? getMediaTypeOfActivityFile({
          buffer: file.buffer,
          fileName: file.originalname
        })
      : undefined;

    if (!mediaType) {
      throw new HttpException(
        {
          error: getReasonPhrase(StatusCodes.BAD_REQUEST),
          message: [
            'The file is not a CSV file in UTF-8, a JPEG, a PDF or a PNG file'
          ]
        },
        StatusCodes.BAD_REQUEST
      );
    }

    if (mediaType === 'text/csv') {
      const dataRowCount = getDataRowCountOfCsvFile(file.buffer);

      if (dataRowCount > AI_MAX_ACTIVITIES) {
        this.logger.warn(`Rejected a CSV file with ${dataRowCount} rows`);

        throw new HttpException(
          {
            error: getReasonPhrase(StatusCodes.BAD_REQUEST),
            message: [
              `The CSV file has more than ${AI_MAX_ACTIVITIES} rows of activities`
            ]
          },
          StatusCodes.BAD_REQUEST
        );
      }
    }

    const abortController = new AbortController();
    const timeoutSignal = AbortSignal.timeout(AI_ACTIVITIES_TIMEOUT);

    response.on('close', () => {
      if (!response.writableFinished) {
        abortController.abort();
      }
    });

    try {
      return await this.aiService.getActivitiesFromFile({
        abortSignal: AbortSignal.any([abortController.signal, timeoutSignal]),
        file: { mediaType, buffer: file.buffer, name: file.originalname },
        user: this.request.user
      });
    } catch (error) {
      if (error instanceof CallerFacingError) {
        throw new HttpException(
          {
            error: getReasonPhrase(StatusCodes.BAD_REQUEST),
            message: [error.message]
          },
          StatusCodes.BAD_REQUEST
        );
      } else if (timeoutSignal.aborted) {
        this.logger.warn(
          `Stopped reading a file of the type ${mediaType} at the timeout of ${AI_ACTIVITIES_TIMEOUT} ms`
        );

        throw new HttpException(
          {
            error: getReasonPhrase(StatusCodes.BAD_REQUEST),
            message: [
              'Ghostfolio AI needs too much time for the file. Split it into smaller files.'
            ]
          },
          StatusCodes.BAD_REQUEST
        );
      }

      throw error;
    }
  }

  @Get('prompt/:mode')
  @HasPermission(permissions.readAiPrompt)
  @RequiresScope(scopes.portfolioRead)
  @UseInterceptors(TransformDataSourceInRequestInterceptor)
  public async getPrompt(
    @Impersonation() { userId, userSettings }: ImpersonationContext,
    @Param('mode') mode: AiPromptMode,
    @Query()
    { accounts, assetClasses, dataSource, symbol, tags }: FilterDto
  ): Promise<AiPromptResponse> {
    const filters = this.apiService.buildFiltersFromQueryParams({
      filterByAccounts: accounts,
      filterByAssetClasses: assetClasses,
      filterByDataSource: dataSource,
      filterBySymbol: symbol,
      filterByTags: tags
    });

    const prompt = await this.aiService.getPrompt({
      filters,
      mode,
      userId,
      languageCode: this.request.user.settings.settings.language,
      userCurrency: userSettings.baseCurrency
    });

    return { prompt };
  }
}
