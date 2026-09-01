import { PortfolioSnapshotComputationError } from '@ghostfolio/api/app/portfolio/errors/portfolio-snapshot-computation.error';
import { CallerFacingError } from '@ghostfolio/api/errors/caller-facing.error';

import {
  Catch,
  HttpException,
  Logger,
  RpcExceptionFilter
} from '@nestjs/common';
import { getReasonPhrase, StatusCodes } from 'http-status-codes';
import { Observable, throwError } from 'rxjs';

/**
 * Turns an exception of a tool of the model context protocol into an error of
 * the caller. Only a message which is written for the caller is passed on, so
 * that an unexpected exception cannot expose internals of the application.
 */
@Catch()
export class McpToolExceptionFilter implements RpcExceptionFilter {
  private readonly logger = new Logger(McpToolExceptionFilter.name);

  public catch(exception: unknown): Observable<never> {
    // The message of this exception is written for the caller, hence it is
    // passed on and is not written to the log
    if (exception instanceof CallerFacingError) {
      return throwError(() => {
        return { message: exception.message, status: 'error' };
      });
    }

    const statusCode = this.getStatus(exception);

    // An exception which the caller causes, for example a refused call, is
    // expected, hence only an exception of the application is written to the
    // log
    if (statusCode >= StatusCodes.INTERNAL_SERVER_ERROR) {
      this.logger.error(exception);
    }

    // The message of an exception can carry internals, for example the
    // property names of a data transfer object of a failed validation, hence
    // the reason phrase of the status is passed on instead
    return throwError(() => {
      return {
        message: this.getReasonPhraseOfStatus(statusCode),
        status: 'error'
      };
    });
  }

  private getReasonPhraseOfStatus(statusCode: number) {
    try {
      return getReasonPhrase(statusCode);
    } catch {
      return getReasonPhrase(StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }

  private getStatus(exception: unknown) {
    if (exception instanceof PortfolioSnapshotComputationError) {
      return StatusCodes.SERVICE_UNAVAILABLE;
    }

    if (exception instanceof HttpException) {
      return exception.getStatus();
    }

    return StatusCodes.INTERNAL_SERVER_ERROR;
  }
}
