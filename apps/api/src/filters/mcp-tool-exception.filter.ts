import { ImportValidationError } from '@ghostfolio/api/app/import/errors/import-validation.error';
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
 * This is the only location which makes that decision, hence a tool needs no
 * error handling of its own.
 */
@Catch()
export class McpToolExceptionFilter implements RpcExceptionFilter {
  private readonly logger = new Logger(McpToolExceptionFilter.name);

  public catch(exception: unknown): Observable<never> {
    // The error of an RpcException is written for the caller already
    if (exception instanceof RpcException) {
      return throwError(() => {
        return exception.getError();
      });
    }

    // The message of a validation names the value which is not valid and is
    // written for the caller, hence it is passed on and stays out of the log
    if (exception instanceof ImportValidationError) {
      return throwError(() => {
        return { message: exception.message, status: 'error' };
      });
    }

    // Every other message can carry internals, for example the property names
    // of a data transfer object of a failed validation, hence it is written to
    // the log and the reason phrase of the status is passed on instead
    this.logger.error(exception);

    return throwError(() => {
      return {
        message: this.getReasonPhraseOfStatus(this.getStatus(exception)),
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
