import { PortfolioSnapshotComputationError } from '@ghostfolio/api/app/portfolio/errors/portfolio-snapshot-computation.error';

import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';
import { Response } from 'express';
import { getReasonPhrase, StatusCodes } from 'http-status-codes';

@Catch(PortfolioSnapshotComputationError)
export class PortfolioSnapshotComputationExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(
    PortfolioSnapshotComputationExceptionFilter.name
  );

  public catch(
    exception: PortfolioSnapshotComputationError,
    host: ArgumentsHost
  ) {
    this.logger.error(exception.message);

    const response = host.switchToHttp().getResponse<Response>();

    response.status(StatusCodes.SERVICE_UNAVAILABLE).json({
      message: getReasonPhrase(StatusCodes.SERVICE_UNAVAILABLE),
      statusCode: StatusCodes.SERVICE_UNAVAILABLE
    });
  }
}
