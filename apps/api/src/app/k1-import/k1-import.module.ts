import { ConfigurationModule } from '@ghostfolio/api/services/configuration/configuration.module';
import { PrismaModule } from '@ghostfolio/api/services/prisma/prisma.module';

import { Module } from '@nestjs/common';

import { CellMappingModule } from '../cell-mapping/cell-mapping.module';
import { UploadModule } from '../upload/upload.module';
import { K1ImportController } from './k1-import.controller';
import { K1ImportService } from './k1-import.service';
import { K1AggregationService } from './k1-aggregation.service';
import { K1AllocationService } from './k1-allocation.service';
import { K1ConfidenceService } from './k1-confidence.service';
import { K1FieldMapperService } from './k1-field-mapper.service';
import { AzureExtractor } from './extractors/azure-extractor';
import { PdfParseExtractor } from './extractors/pdf-parse-extractor';
import { TesseractExtractor } from './extractors/tesseract-extractor';

@Module({
  controllers: [K1ImportController],
  exports: [K1ImportService],
  imports: [CellMappingModule, ConfigurationModule, PrismaModule, UploadModule],
  providers: [
    AzureExtractor,
    K1AggregationService,
    K1AllocationService,
    K1ConfidenceService,
    K1FieldMapperService,
    K1ImportService,
    PdfParseExtractor,
    TesseractExtractor
  ]
})
export class K1ImportModule {}
