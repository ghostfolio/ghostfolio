import { HAS_PERMISSION_KEY } from '@ghostfolio/api/decorators/has-permission.decorator';
import { CallerFacingError } from '@ghostfolio/api/errors/caller-facing.error';
import { CustomThrottlerGuard } from '@ghostfolio/api/guards/custom-throttler.guard';
import { HasPermissionGuard } from '@ghostfolio/api/guards/has-permission.guard';
import { ApiService } from '@ghostfolio/api/services/api/api.service';
import {
  AI_ACTIVITIES_TIMEOUT,
  AI_MAX_ACTIVITIES,
  THROTTLE_AI_ACTIVITIES_LIMIT,
  THROTTLE_AI_ACTIVITIES_TTL
} from '@ghostfolio/common/config';
import { permissions } from '@ghostfolio/common/permissions';
import type { RequestWithUser } from '@ghostfolio/common/types';

import { HttpException, Logger } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import {
  THROTTLER_LIMIT,
  THROTTLER_TRACKER,
  THROTTLER_TTL
} from '@nestjs/throttler/dist/throttler.constants';
import type { Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { EventEmitter } from 'node:events';

import { AiController } from './ai.controller';
import { AiService } from './ai.service';

// The packages are ECMAScript modules, which Jest cannot load
jest.mock('@openrouter/ai-sdk-provider', () => {
  return {};
});
jest.mock('ai', () => {
  return {};
});

describe('AiController', () => {
  const pdfFile = {
    buffer: Buffer.from('%PDF-1.7'),
    originalname: 'statement.pdf'
  };

  const user = { id: 'user-id' };

  let aiController: AiController;
  let aiService: AiService;

  function createCsvFile(dataRowCount: number) {
    return {
      buffer: Buffer.from(
        [
          'Date,Symbol',
          ...Array.from({ length: dataRowCount }, () => {
            return '2026-01-15,AAPL';
          })
        ].join('\n')
      ),
      originalname: 'statement.csv'
    };
  }

  function createResponse() {
    return Object.assign(new EventEmitter(), {
      writableFinished: false
    }) as unknown as Response;
  }

  function getMetadataOfMethod<T>(metadataKey: string) {
    return Reflect.getMetadata(
      metadataKey,
      AiController.prototype.getActivitiesFromFile
    ) as T;
  }

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    aiService = {
      getActivitiesFromFile: jest.fn().mockResolvedValue({
        activities: [],
        assetProfiles: [],
        rowsWithoutMatch: []
      })
    } as unknown as AiService;

    aiController = new AiController(
      aiService,
      {} as ApiService,
      {
        user
      } as unknown as RequestWithUser
    );
  });

  describe('getActivitiesFromFile', () => {
    it('Requires the permission and limits the requests of each user per week', () => {
      expect(getMetadataOfMethod<string>(HAS_PERMISSION_KEY)).toBe(
        permissions.enableGhostfolioAi
      );

      const guards = getMetadataOfMethod<unknown[]>(GUARDS_METADATA);

      expect(guards.slice(1)).toEqual([
        HasPermissionGuard,
        CustomThrottlerGuard
      ]);

      expect(getMetadataOfMethod<number>(`${THROTTLER_LIMIT}default`)).toBe(
        THROTTLE_AI_ACTIVITIES_LIMIT
      );

      expect(getMetadataOfMethod<number>(`${THROTTLER_TTL}default`)).toBe(
        THROTTLE_AI_ACTIVITIES_TTL
      );

      expect(
        getMetadataOfMethod<(request: unknown) => string>(
          `${THROTTLER_TRACKER}default`
        )({ ip: '127.0.0.1', user })
      ).toBe(user.id);
    });

    it('Refuses a request without a file or with a file of another type', async () => {
      for (const file of [
        undefined,
        { buffer: Buffer.from('Date,Symbol'), originalname: 'statement.txt' }
      ]) {
        await expect(
          aiController.getActivitiesFromFile(createResponse(), file)
        ).rejects.toThrow(HttpException);
      }

      expect(aiService.getActivitiesFromFile).not.toHaveBeenCalled();
    });

    it(`Refuses a CSV file with more than ${AI_MAX_ACTIVITIES} rows before a model call`, async () => {
      await expect(
        aiController.getActivitiesFromFile(
          createResponse(),
          createCsvFile(AI_MAX_ACTIVITIES + 1)
        )
      ).rejects.toThrow(HttpException);

      expect(aiService.getActivitiesFromFile).not.toHaveBeenCalled();

      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        `Rejected a CSV file with ${AI_MAX_ACTIVITIES + 1} rows`
      );
    });

    it(`Accepts a CSV file with ${AI_MAX_ACTIVITIES} rows`, async () => {
      const file = createCsvFile(AI_MAX_ACTIVITIES);

      await aiController.getActivitiesFromFile(createResponse(), file);

      expect(aiService.getActivitiesFromFile).toHaveBeenCalledWith(
        expect.objectContaining({
          file: {
            buffer: file.buffer,
            mediaType: 'text/csv',
            name: 'statement.csv'
          }
        })
      );
    });

    it('Passes the file with its media type and its name and the user of the request', async () => {
      await expect(
        aiController.getActivitiesFromFile(createResponse(), pdfFile)
      ).resolves.toEqual({
        activities: [],
        assetProfiles: [],
        rowsWithoutMatch: []
      });

      expect(aiService.getActivitiesFromFile).toHaveBeenCalledWith(
        expect.objectContaining({
          user,
          file: {
            buffer: pdfFile.buffer,
            mediaType: 'application/pdf',
            name: 'statement.pdf'
          }
        })
      );

      const [[{ abortSignal }]] = jest.mocked(aiService.getActivitiesFromFile)
        .mock.calls;

      expect(abortSignal).toBeInstanceOf(AbortSignal);
    });

    it('Stops the models if the client closes the request before the response', async () => {
      const response = createResponse();

      await aiController.getActivitiesFromFile(response, pdfFile);

      const [[{ abortSignal }]] = jest.mocked(aiService.getActivitiesFromFile)
        .mock.calls;

      expect(abortSignal.aborted).toBe(false);

      response.emit('close');

      expect(abortSignal.aborted).toBe(true);
    });

    it('Does not stop the models when the response is finished', async () => {
      const response = createResponse();

      await aiController.getActivitiesFromFile(response, pdfFile);

      const [[{ abortSignal }]] = jest.mocked(aiService.getActivitiesFromFile)
        .mock.calls;

      Object.assign(response, { writableFinished: true });
      response.emit('close');

      expect(abortSignal.aborted).toBe(false);
    });

    it('Gives the status 400 with the message of an error for the caller', async () => {
      jest
        .mocked(aiService.getActivitiesFromFile)
        .mockRejectedValueOnce(
          new CallerFacingError('The file has too many activities')
        );

      await expect(
        aiController.getActivitiesFromFile(createResponse(), pdfFile)
      ).rejects.toMatchObject({
        response: { message: ['The file has too many activities'] },
        status: StatusCodes.BAD_REQUEST
      });
    });

    it('Gives the status 400 with a message for the caller at the timeout', async () => {
      const timeoutSignal = AbortSignal.abort(
        new DOMException(
          'The operation was aborted due to timeout',
          'TimeoutError'
        )
      );

      jest.spyOn(AbortSignal, 'timeout').mockReturnValueOnce(timeoutSignal);

      jest
        .mocked(aiService.getActivitiesFromFile)
        .mockRejectedValueOnce(timeoutSignal.reason);

      await expect(
        aiController.getActivitiesFromFile(createResponse(), pdfFile)
      ).rejects.toMatchObject({
        response: {
          message: [
            'Ghostfolio AI needs too much time for the file. Split it into smaller files.'
          ]
        },
        status: StatusCodes.BAD_REQUEST
      });

      expect(AbortSignal.timeout).toHaveBeenCalledWith(AI_ACTIVITIES_TIMEOUT);

      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        `Stopped reading a file of the type application/pdf at the timeout of ${AI_ACTIVITIES_TIMEOUT} ms`
      );
    });

    it('Passes on every other error', async () => {
      const error = new Error('Model error');

      jest.mocked(aiService.getActivitiesFromFile).mockRejectedValueOnce(error);

      await expect(
        aiController.getActivitiesFromFile(createResponse(), pdfFile)
      ).rejects.toBe(error);
    });
  });
});
