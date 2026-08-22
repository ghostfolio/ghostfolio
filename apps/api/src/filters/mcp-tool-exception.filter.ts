import { PortfolioSnapshotComputationError } from '@ghostfolio/api/app/portfolio/errors/portfolio-snapshot-computation.error';

import {
  Catch,
  HttpException,
  Logger,
  RpcExceptionFilter
} from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
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
    this.logger.error(exception);

    // The payload is written for the caller already
    if (exception instanceof RpcException) {
      return throwError(() => {
        return exception.getError();
      });
    }

    return throwError(() => {
      return { message: this.getMessage(exception), status: 'error' };
    });
  }

  private getMessage(exception: unknown) {
    // The message of an exception can carry internals, for example the
    // property names of a data transfer object of a failed validation, hence
    // the reason phrase of the status is passed on instead
    return this.getReasonPhraseOfStatus(this.getStatus(exception));
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
