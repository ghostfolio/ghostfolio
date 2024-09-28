import { Module } from '@nestjs/common';

import { PerformanceLoggingInterceptor } from './performance-logging.interceptor';
import { PerformanceLoggingService } from './performance-logging.service';

@Module({
  exports: [PerformanceLoggingInterceptor, PerformanceLoggingService],
  providers: [PerformanceLoggingInterceptor, PerformanceLoggingService]
})
export class PerformanceLoggingModule {}
