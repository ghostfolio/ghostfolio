import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class PerformanceLoggingService {
  public logPerformance({
    className,
    methodName,
    startTime
  }: {
    className: string;
    methodName: string;
    startTime: number;
  }) {
    const endTime = performance.now();

    Logger.debug(
      `Completed execution of ${methodName}() in ${((endTime - startTime) / 1000).toFixed(3)} seconds`,
      className
    );
  }
}
