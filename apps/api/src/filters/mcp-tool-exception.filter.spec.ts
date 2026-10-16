import { ImportValidationError } from '@ghostfolio/api/app/import/errors/import-validation.error';
import { PortfolioSnapshotComputationError } from '@ghostfolio/api/app/portfolio/errors/portfolio-snapshot-computation.error';

import { ForbiddenException, Logger } from '@nestjs/common';
import { getReasonPhrase, StatusCodes } from 'http-status-codes';
import { firstValueFrom } from 'rxjs';

import { McpToolExceptionFilter } from './mcp-tool-exception.filter';

describe('McpToolExceptionFilter', () => {
  let filter: McpToolExceptionFilter;
  let logError: jest.SpyInstance;

  async function getErrorOfException(exception: unknown) {
    try {
      await firstValueFrom(filter.catch(exception));
    } catch (error) {
      return error;
    }

    throw new Error('The filter gave no error');
  }

  beforeEach(() => {
    filter = new McpToolExceptionFilter();

    logError = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('Passes on the message of an error which is written for the caller', async () => {
    const exception = new ImportValidationError(
      'activities.0.symbol ("X") is not valid'
    );

    expect(await getErrorOfException(exception)).toEqual({
      message: 'activities.0.symbol ("X") is not valid',
      status: 'error'
    });

    expect(logError).not.toHaveBeenCalled();
  });

  it('Hides the message of an unexpected error and writes it to the log', async () => {
    const exception = new Error(
      'Unique constraint failed on the fields: (dataSource)'
    );

    expect(await getErrorOfException(exception)).toEqual({
      message: getReasonPhrase(StatusCodes.INTERNAL_SERVER_ERROR),
      status: 'error'
    });

    expect(logError).toHaveBeenCalledWith(exception);
  });

  // An access without the scope of a tool causes a refused call at each
  // attempt, which would fill the log
  it('Gives the reason phrase of the status of an HttpException and writes no log', async () => {
    expect(await getErrorOfException(new ForbiddenException())).toEqual({
      message: getReasonPhrase(StatusCodes.FORBIDDEN),
      status: 'error'
    });

    expect(logError).not.toHaveBeenCalled();
  });

  it('Gives the reason phrase of a service which is not available if a snapshot cannot be computed', async () => {
    const exception = new PortfolioSnapshotComputationError(
      'The snapshot cannot be computed'
    );

    expect(await getErrorOfException(exception)).toEqual({
      message: getReasonPhrase(StatusCodes.SERVICE_UNAVAILABLE),
      status: 'error'
    });

    expect(logError).toHaveBeenCalledWith(exception);
  });
});
