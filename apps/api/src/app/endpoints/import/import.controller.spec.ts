import { ImportValidationError } from '@ghostfolio/api/services/import/errors/import-validation.error';
import { ImportDataDto } from '@ghostfolio/api/services/import/import-data.dto';
import { ImportService } from '@ghostfolio/api/services/import/import.service';
import { permissions } from '@ghostfolio/common/permissions';
import type { RequestWithUser } from '@ghostfolio/common/types';

import { Logger } from '@nestjs/common';
import { getReasonPhrase, StatusCodes } from 'http-status-codes';

import { ImportController } from './import.controller';

describe('ImportController', () => {
  const importData = { activities: [] } as ImportDataDto;

  let importController: ImportController;
  let importService: ImportService;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation();

    importService = {
      import: jest.fn()
    } as unknown as ImportService;

    importController = new ImportController(importService, {
      user: { permissions: [permissions.createAccount] }
    } as unknown as RequestWithUser);
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

    it('Gives the status 400 without the message of every other error', async () => {
      jest
        .mocked(importService.import)
        .mockRejectedValueOnce(
          new Error('Invalid `prisma.order.create()` invocation')
        );

      await expect(importController.import(importData)).rejects.toMatchObject({
        response: { message: [getReasonPhrase(StatusCodes.BAD_REQUEST)] },
        status: StatusCodes.BAD_REQUEST
      });
    });
  });
});
