import { ImportValidationError } from '@ghostfolio/api/services/import/errors/import-validation.error';
import { ImportDataDto } from '@ghostfolio/api/services/import/import-data.dto';
import { ImportService } from '@ghostfolio/api/services/import/import.service';
import { permissions } from '@ghostfolio/common/permissions';
import type { RequestWithUser } from '@ghostfolio/common/types';

import { HttpException, Logger } from '@nestjs/common';
import { getReasonPhrase, StatusCodes } from 'http-status-codes';

import { ImportController } from './import.controller';

describe('ImportController', () => {
  const importData = { activities: [] } as ImportDataDto;

  let importController: ImportController;
  let importService: ImportService;
  let logError: jest.SpyInstance;

  beforeEach(() => {
    logError = jest.spyOn(Logger.prototype, 'error').mockImplementation();

    importService = {
      import: jest.fn()
    } as unknown as ImportService;

    importController = new ImportController(importService, {
      user: { permissions: [permissions.createAccount] }
    } as unknown as RequestWithUser);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('import', () => {
    it('Gives the status 400 with the message of an error for the caller', async () => {
      jest
        .mocked(importService.import)
        .mockRejectedValueOnce(
          new ImportValidationError('activities.0.accountId ("1") is not valid')
        );

      await expect(importController.import(importData)).rejects.toMatchObject({
        response: { message: ['activities.0.accountId ("1") is not valid'] },
        status: StatusCodes.BAD_REQUEST
      });
    });

    it('Gives the status 400 with the reason phrase of the status of an HTTP exception', async () => {
      jest
        .mocked(importService.import)
        .mockRejectedValueOnce(
          new HttpException(
            'Unique constraint failed on the fields: (`name`,`userId`)',
            StatusCodes.CONFLICT
          )
        );

      await expect(importController.import(importData)).rejects.toMatchObject({
        response: { message: [getReasonPhrase(StatusCodes.CONFLICT)] },
        status: StatusCodes.BAD_REQUEST
      });
    });

    it('Gives the status 400 without the message of every other error', async () => {
      const error = new Error('Invalid `prisma.order.create()` invocation');

      jest.mocked(importService.import).mockRejectedValueOnce(error);

      await expect(importController.import(importData)).rejects.toMatchObject({
        response: { message: [getReasonPhrase(StatusCodes.BAD_REQUEST)] },
        status: StatusCodes.BAD_REQUEST
      });

      expect(logError).toHaveBeenCalledWith(error);
    });
  });
});
