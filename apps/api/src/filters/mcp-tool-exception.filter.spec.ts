import { ImportValidationError } from '@ghostfolio/api/app/import/errors/import-validation.error';
import { PortfolioSnapshotComputationError } from '@ghostfolio/api/app/portfolio/errors/portfolio-snapshot-computation.error';

import { HttpException, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { getReasonPhrase, StatusCodes } from 'http-status-codes';
import { firstValueFrom } from 'rxjs';

import { McpToolExceptionFilter } from './mcp-tool-exception.filter';

describe('McpToolExceptionFilter', () => {
  let filter: McpToolExceptionFilter;
  let logError: jest.SpyInstance;

  function catchError(exception: unknown) {
    return firstValueFrom(filter.catch(exception));
  }

  beforeEach(() => {
    filter = new McpToolExceptionFilter();
    logError = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('Passes on the error of an RpcException', async () => {
    await expect(
      catchError(new RpcException('The activity is not valid'))
    ).rejects.toEqual('The activity is not valid');
  });

  it('Passes on the message of a validation', async () => {
    await expect(
      catchError(
        new ImportValidationError('activities.0.symbol ("X") is not valid')
      )
    ).rejects.toEqual({
      message: 'activities.0.symbol ("X") is not valid',
      status: 'error'
    });
  });

  it('Does not write the message of a validation to the log', async () => {
    await expect(
      catchError(new ImportValidationError('activities.0.symbol is not valid'))
    ).rejects.toBeDefined();

    expect(logError).not.toHaveBeenCalled();
  });

  it('Hides the message of an unexpected error and writes it to the log', async () => {
    const exception = new Error(
      'Unique constraint failed on the fields: (dataSource)'
    );

    await expect(catchError(exception)).rejects.toEqual({
      message: getReasonPhrase(StatusCodes.INTERNAL_SERVER_ERROR),
      status: 'error'
    });

    expect(logError).toHaveBeenCalledWith(exception);
  });

  it('Gives the reason phrase of the status of an HttpException', async () => {
    await expect(
      catchError(
        new HttpException('The user has no permission', StatusCodes.FORBIDDEN)
      )
    ).rejects.toEqual({
      message: getReasonPhrase(StatusCodes.FORBIDDEN),
      status: 'error'
    });
  });

  it('Tells that the service is unavailable if the snapshot fails', async () => {
    await expect(
      catchError(
        new PortfolioSnapshotComputationError('The snapshot is not computed')
      )
    ).rejects.toEqual({
      message: getReasonPhrase(StatusCodes.SERVICE_UNAVAILABLE),
      status: 'error'
    });
  });
});
