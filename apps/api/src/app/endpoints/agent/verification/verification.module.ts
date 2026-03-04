import { Module } from '@nestjs/common';

import { ConfidenceScorer } from './confidence-scorer';
import { DisclaimerInjector } from './disclaimer-injector';
import { DomainValidator } from './domain-validator';
import { FactChecker } from './fact-checker';
import { HallucinationDetector } from './hallucination-detector';
import { OutputValidator } from './output-validator';
import { VerificationService } from './verification.service';

@Module({
  providers: [
    FactChecker,
    HallucinationDetector,
    ConfidenceScorer,
    DomainValidator,
    OutputValidator,
    DisclaimerInjector,
    VerificationService
  ],
  exports: [VerificationService]
})
export class VerificationModule {}
