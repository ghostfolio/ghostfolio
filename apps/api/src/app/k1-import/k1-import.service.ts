import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { UploadService } from '../upload/upload.service';
import { CellMappingService } from '../cell-mapping/cell-mapping.service';
import { K1FieldMapperService } from './k1-field-mapper.service';
import { K1ConfidenceService } from './k1-confidence.service';
import { K1AllocationService } from './k1-allocation.service';
import { K1AggregationService } from './k1-aggregation.service';
import { PdfParseExtractor } from './extractors/pdf-parse-extractor';
import { AzureExtractor } from './extractors/azure-extractor';
import { TesseractExtractor } from './extractors/tesseract-extractor';

import { HttpException, Injectable } from '@nestjs/common';
import { K1ImportStatus } from '@prisma/client';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';

@Injectable()
export class K1ImportService {
  public constructor(
    private readonly prismaService: PrismaService,
    private readonly uploadService: UploadService,
    private readonly cellMappingService: CellMappingService,
    private readonly fieldMapperService: K1FieldMapperService,
    private readonly confidenceService: K1ConfidenceService,
    private readonly allocationService: K1AllocationService,
    private readonly aggregationService: K1AggregationService,
    private readonly pdfParseExtractor: PdfParseExtractor,
    private readonly azureExtractor: AzureExtractor,
    private readonly tesseractExtractor: TesseractExtractor
  ) {}
}
