import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import type { K1ExtractionResult } from '@ghostfolio/common/interfaces';

import { HttpException, Injectable, Logger } from '@nestjs/common';
import { K1ImportStatus, KDocumentStatus } from '@prisma/client';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { CellMappingService } from '../cell-mapping/cell-mapping.service';
import { UploadService } from '../upload/upload.service';
import { AzureExtractor } from './extractors/azure-extractor';
import { PdfParseExtractor } from './extractors/pdf-parse-extractor';
import { TesseractExtractor } from './extractors/tesseract-extractor';
import { K1AggregationService } from './k1-aggregation.service';
import { K1AllocationService } from './k1-allocation.service';
import { K1ConfidenceService } from './k1-confidence.service';
import { K1FieldMapperService } from './k1-field-mapper.service';

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

@Injectable()
export class K1ImportService {
  private readonly logger = new Logger(K1ImportService.name);

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

  /**
   * Upload a K-1 PDF and initiate extraction.
   * FR-001, FR-003, FR-005, FR-028
   */
  public async uploadAndExtract({
    file,
    partnershipId,
    taxYear,
    userId
  }: {
    file: any;
    partnershipId: string;
    taxYear: number;
    userId: string;
  }) {
    // Validate PDF MIME type (FR-003)
    if (file.mimetype !== 'application/pdf') {
      throw new HttpException(
        'File is not a valid PDF',
        StatusCodes.BAD_REQUEST
      );
    }

    // Validate file size (FR-028)
    if (file.size > MAX_FILE_SIZE) {
      throw new HttpException(
        'File exceeds 25 MB size limit',
        StatusCodes.BAD_REQUEST
      );
    }

    // Validate partnership exists and belongs to user
    const partnership = await this.prismaService.partnership.findFirst({
      where: {
        id: partnershipId,
        userId
      },
      include: {
        memberships: {
          where: { isActive: true }
        }
      }
    });

    if (!partnership) {
      throw new HttpException(
        'Partnership not found or not owned by user',
        StatusCodes.BAD_REQUEST
      );
    }

    if (!partnership.memberships || partnership.memberships.length === 0) {
      throw new HttpException(
        'Partnership has no active members',
        StatusCodes.BAD_REQUEST
      );
    }

    // Validate tax year >= partnership inception year
    if (partnership.inceptionDate) {
      const inceptionYear = new Date(partnership.inceptionDate).getFullYear();
      if (taxYear < inceptionYear) {
        throw new HttpException(
          `Tax year must be >= partnership inception year (${inceptionYear})`,
          StatusCodes.BAD_REQUEST
        );
      }
    }

    // Create Document record for the uploaded PDF
    const document = await this.uploadService.createDocument({
      file,
      partnershipId,
      taxYear,
      type: 'K1',
      name: file.originalname
    });

    // Create import session in PROCESSING status
    const session = await this.prismaService.k1ImportSession.create({
      data: {
        partnershipId,
        userId,
        status: K1ImportStatus.PROCESSING,
        taxYear,
        fileName: file.originalname,
        fileSize: file.size,
        extractionMethod: 'pending',
        documentId: document.id
      }
    });

    // Run extraction asynchronously (don't block the response)
    this.runExtraction(session.id, file, partnershipId).catch((err) => {
      this.logger.error(
        `Extraction failed for session ${session.id}: ${err.message}`,
        err.stack
      );
    });

    return {
      id: session.id,
      partnershipId: session.partnershipId,
      status: session.status,
      taxYear: session.taxYear,
      fileName: session.fileName,
      fileSize: session.fileSize,
      extractionMethod: session.extractionMethod,
      createdAt: session.createdAt
    };
  }

  /**
   * Get an import session by ID with ownership check.
   */
  public async getSession(sessionId: string, userId: string) {
    const session = await this.prismaService.k1ImportSession.findUnique({
      where: { id: sessionId }
    });

    if (!session) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.NOT_FOUND),
        StatusCodes.NOT_FOUND
      );
    }

    if (session.userId !== userId) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    return session;
  }

  /**
   * Run the two-tier extraction pipeline.
   * Tier 1: pdf-parse (for digital PDFs)
   * Tier 2: Azure DI or tesseract.js (for scanned PDFs)
   */
  private async runExtraction(
    sessionId: string,
    file: any,
    partnershipId: string
  ) {
    try {
      // Read the file buffer
      const uploadDir = this.uploadService.getUploadDir();
      const doc = await this.prismaService.k1ImportSession.findUnique({
        where: { id: sessionId },
        include: { document: true }
      });

      let buffer: Buffer;
      if (doc?.document?.filePath) {
        const fullPath = join(uploadDir, doc.document.filePath);
        buffer = await readFile(fullPath);
      } else if (file.path) {
        buffer = await readFile(file.path);
      } else if (file.buffer) {
        buffer = file.buffer;
      } else {
        throw new Error('No file buffer available');
      }

      // Check for password-protected PDFs (FR-029)
      await this.checkPasswordProtected(buffer);

      // Tier 1: Try pdf-parse for digital PDFs
      let extractionResult: K1ExtractionResult;
      let method: string;

      const isDigital = await this.pdfParseExtractor.isDigitalK1(buffer);

      if (isDigital) {
        this.logger.log(`Session ${sessionId}: Digital K-1 detected, using pdf-parse`);
        extractionResult = await this.pdfParseExtractor.extract(
          buffer,
          doc?.fileName || 'unknown.pdf'
        );
        method = 'pdf-parse';
      } else {
        // Tier 2: Scanned PDF — try Azure first, fall back to tesseract
        if (this.azureExtractor.isAvailable()) {
          this.logger.log(`Session ${sessionId}: Scanned K-1, using Azure DI`);
          extractionResult = await this.azureExtractor.extract(
            buffer,
            doc?.fileName || 'unknown.pdf'
          );
          method = 'azure';
        } else {
          this.logger.log(
            `Session ${sessionId}: Scanned K-1, using tesseract.js (Azure not configured)`
          );
          extractionResult = await this.tesseractExtractor.extract(
            buffer,
            doc?.fileName || 'unknown.pdf'
          );
          method = 'tesseract';
        }
      }

      // Map fields using cell mapping configuration
      const mappedResult = await this.fieldMapperService.mapFields(
        extractionResult,
        partnershipId
      );

      // Fill in missing boxes (empty values for unmapped IRS boxes)
      const completeResult = await this.fieldMapperService.fillMissingBoxes(
        mappedResult,
        partnershipId
      );

      // Update session with extraction results
      await this.prismaService.k1ImportSession.update({
        where: { id: sessionId },
        data: {
          status: K1ImportStatus.EXTRACTED,
          extractionMethod: method,
          rawExtraction: completeResult as any
        }
      });

      this.logger.log(
        `Session ${sessionId}: Extraction complete (${method}), ${completeResult.fields.length} fields, confidence ${completeResult.overallConfidence}`
      );
    } catch (error) {
      this.logger.error(
        `Session ${sessionId}: Extraction failed: ${error.message}`,
        error.stack
      );

      await this.prismaService.k1ImportSession.update({
        where: { id: sessionId },
        data: {
          status: K1ImportStatus.FAILED,
          errorMessage: error.message || 'Extraction failed'
        }
      });
    }
  }

  /**
   * Verify extraction results.
   * EXTRACTED → VERIFIED transition.
   * FR-006 through FR-010, FR-035 (block if unreviewed medium/low), validation rule 10
   */
  public async verify(
    sessionId: string,
    userId: string,
    data: {
      taxYear: number;
      fields: any[];
      unmappedItems?: any[];
    }
  ) {
    const session = await this.getSession(sessionId, userId);

    // Only EXTRACTED sessions can be verified
    if (session.status !== K1ImportStatus.EXTRACTED) {
      throw new HttpException(
        'Session must be in EXTRACTED status to verify',
        StatusCodes.BAD_REQUEST
      );
    }

    // Validate fields not empty
    if (!data.fields || data.fields.length === 0) {
      throw new HttpException(
        'Fields array cannot be empty',
        StatusCodes.BAD_REQUEST
      );
    }

    // FR-035: All medium/low-confidence fields must be reviewed
    const unreviewedFields = data.fields.filter(
      (f) =>
        (f.confidenceLevel === 'MEDIUM' || f.confidenceLevel === 'LOW') &&
        !f.isReviewed
    );
    if (unreviewedFields.length > 0) {
      throw new HttpException(
        `${unreviewedFields.length} medium/low-confidence fields have not been reviewed`,
        StatusCodes.BAD_REQUEST
      );
    }

    // Validation rule 10: All unmapped items must be resolved
    if (data.unmappedItems && data.unmappedItems.length > 0) {
      const unresolvedItems = data.unmappedItems.filter(
        (item) => !item.resolution || item.resolution === null
      );
      if (unresolvedItems.length > 0) {
        throw new HttpException(
          `${unresolvedItems.length} unmapped items have not been resolved`,
          StatusCodes.BAD_REQUEST
        );
      }
    }

    // Transition to VERIFIED and store verified data
    const updated = await this.prismaService.k1ImportSession.update({
      where: { id: sessionId },
      data: {
        status: K1ImportStatus.VERIFIED,
        taxYear: data.taxYear,
        verifiedData: {
          fields: data.fields,
          unmappedItems: data.unmappedItems || []
        } as any
      }
    });

    this.logger.log(
      `Session ${sessionId}: Verified with ${data.fields.length} fields`
    );

    return updated;
  }

  /**
   * Cancel an import session.
   * FR-011: Discard extraction data, status → CANCELLED.
   */
  public async cancel(sessionId: string, userId: string) {
    const session = await this.getSession(sessionId, userId);

    // Cannot cancel already CONFIRMED or CANCELLED sessions
    if (
      session.status === K1ImportStatus.CONFIRMED ||
      session.status === K1ImportStatus.CANCELLED
    ) {
      throw new HttpException(
        `Cannot cancel a session in ${session.status} status`,
        StatusCodes.BAD_REQUEST
      );
    }

    const updated = await this.prismaService.k1ImportSession.update({
      where: { id: sessionId },
      data: {
        status: K1ImportStatus.CANCELLED
      }
    });

    this.logger.log(`Session ${sessionId}: Cancelled`);

    return updated;
  }

  /**
   * Get import history for a partnership, optionally filtered by tax year.
   * FR-022: History of all K-1 import attempts per partnership.
   */
  public async getHistory(
    userId: string,
    partnershipId: string,
    taxYear?: number
  ) {
    const where: any = { userId, partnershipId };
    if (taxYear) {
      where.taxYear = taxYear;
    }

    const sessions = await this.prismaService.k1ImportSession.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        partnershipId: true,
        status: true,
        taxYear: true,
        fileName: true,
        extractionMethod: true,
        kDocumentId: true,
        createdAt: true
      }
    });

    return sessions;
  }

  /**
   * Re-process a previously uploaded K-1 PDF with the current cell mapping.
   * FR-023: Creates a new import session using the stored document from the original session.
   */
  public async reprocess(sessionId: string, userId: string) {
    const originalSession = await this.getSession(sessionId, userId);

    if (!originalSession.documentId) {
      throw new HttpException(
        'Original session has no stored document to re-process',
        StatusCodes.BAD_REQUEST
      );
    }

    // Read the stored file from uploads directory
    const document = await this.prismaService.document.findUnique({
      where: { id: originalSession.documentId }
    });

    if (!document) {
      throw new HttpException(
        'Stored document not found',
        StatusCodes.NOT_FOUND
      );
    }

    // Create a new import session in PROCESSING status
    const newSession = await this.prismaService.k1ImportSession.create({
      data: {
        partnershipId: originalSession.partnershipId,
        userId,
        status: K1ImportStatus.PROCESSING,
        taxYear: originalSession.taxYear,
        fileName: originalSession.fileName,
        fileSize: originalSession.fileSize,
        extractionMethod: 'pending',
        documentId: originalSession.documentId
      }
    });

    // Read file from disk and run extraction asynchronously
    const fs = await import('fs/promises');
    const filePath = (document as any).url || (document as any).filePath;

    if (!filePath) {
      throw new HttpException(
        'Cannot determine file path for stored document',
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    const fileBuffer = await fs.readFile(filePath);
    const file = {
      buffer: fileBuffer,
      originalname: originalSession.fileName,
      mimetype: 'application/pdf',
      size: originalSession.fileSize
    };

    this.runExtraction(
      newSession.id,
      file,
      originalSession.partnershipId
    ).catch((err) => {
      this.logger.error(
        `Reprocess extraction failed for session ${newSession.id}: ${err.message}`,
        err.stack
      );
    });

    this.logger.log(
      `Session ${sessionId}: Re-processing started as new session ${newSession.id}`
    );

    return {
      id: newSession.id,
      partnershipId: newSession.partnershipId,
      status: newSession.status,
      taxYear: newSession.taxYear,
      fileName: newSession.fileName,
      fileSize: newSession.fileSize,
      extractionMethod: newSession.extractionMethod,
      createdAt: newSession.createdAt
    };
  }

  /**
   * Confirm verified data and auto-create model objects.
   * VERIFIED → CONFIRMED transition.
   * FR-012 (KDocument), FR-013 (allocations), FR-014 (Distributions), FR-015 (Document linkage), FR-016 (duplicate detection).
   */
  public async confirm(
    sessionId: string,
    userId: string,
    data: {
      filingStatus: KDocumentStatus;
      existingKDocumentAction?: 'UPDATE' | 'CREATE_NEW';
    }
  ) {
    const session = await this.getSession(sessionId, userId);

    // Only VERIFIED sessions can be confirmed
    if (session.status !== K1ImportStatus.VERIFIED) {
      throw new HttpException(
        'Session must be in VERIFIED status to confirm',
        StatusCodes.BAD_REQUEST
      );
    }

    const verifiedData = session.verifiedData as any;
    if (!verifiedData?.fields || verifiedData.fields.length === 0) {
      throw new HttpException(
        'No verified data available',
        StatusCodes.BAD_REQUEST
      );
    }

    // Check for active members (FR-013)
    const memberships =
      await this.prismaService.partnershipMembership.findMany({
        where: {
          partnershipId: session.partnershipId,
          effectiveDate: {
            lte: new Date(session.taxYear, 11, 31)
          },
          OR: [
            { endDate: null },
            { endDate: { gte: new Date(session.taxYear, 11, 31) } }
          ]
        },
        include: { entity: true }
      });

    if (memberships.length === 0) {
      throw new HttpException(
        'Partnership has no active members',
        StatusCodes.BAD_REQUEST
      );
    }

    // FR-016: Check for existing KDocument (duplicate detection)
    const existingKDocument = await this.prismaService.kDocument.findUnique({
      where: {
        partnershipId_type_taxYear: {
          partnershipId: session.partnershipId,
          type: 'K1',
          taxYear: session.taxYear
        }
      }
    });

    if (existingKDocument && !data.existingKDocumentAction) {
      throw new HttpException(
        'A KDocument already exists for this partnership, type, and tax year. Specify existingKDocumentAction (UPDATE or CREATE_NEW).',
        StatusCodes.CONFLICT
      );
    }

    // Build KDocument data from verified fields
    const kDocumentData: Record<string, number | null> = {};
    for (const field of verifiedData.fields) {
      kDocumentData[field.boxNumber] = field.numericValue ?? null;
    }

    // FR-012: Create or update KDocument
    let kDocument;
    if (existingKDocument && data.existingKDocumentAction === 'UPDATE') {
      // FR-025: Preserve previous values for audit trail
      const previousData = existingKDocument.data;
      const previousFilingStatus = existingKDocument.filingStatus;

      kDocument = await this.prismaService.kDocument.update({
        where: { id: existingKDocument.id },
        data: {
          filingStatus: data.filingStatus,
          data: kDocumentData as any,
          previousData: previousData as any,
          previousFilingStatus,
          documentFileId: session.documentId
        }
      });
    } else {
      // CREATE_NEW or no existing document
      if (existingKDocument && data.existingKDocumentAction === 'CREATE_NEW') {
        // Delete existing unique constraint holder to create new
        await this.prismaService.kDocument.delete({
          where: { id: existingKDocument.id }
        });
      }

      kDocument = await this.prismaService.kDocument.create({
        data: {
          partnershipId: session.partnershipId,
          type: 'K1',
          taxYear: session.taxYear,
          filingStatus: data.filingStatus,
          data: kDocumentData as any,
          documentFileId: session.documentId
        }
      });
    }

    // FR-013: Allocate K-1 amounts to members
    const allocations = await this.allocationService.allocateToMembers(
      session.partnershipId,
      session.taxYear,
      verifiedData.fields
    );

    // FR-014: Create Distribution records for Box 19a and Box 19b
    const distributions: any[] = [];
    const distributionDate = new Date(session.taxYear, 11, 31); // Dec 31

    for (const allocation of allocations) {
      // Box 19a: Cash and marketable securities
      const box19a = allocation.allocatedValues['19a'];
      if (box19a && box19a !== 0) {
        const dist = await this.prismaService.distribution.create({
          data: {
            partnershipId: session.partnershipId,
            entityId: allocation.entityId,
            type: 'RETURN_OF_CAPITAL',
            amount: box19a,
            date: distributionDate,
            currency: 'USD',
            notes: `K-1 Box 19a (Cash distributions) - Tax Year ${session.taxYear}`
          }
        });
        distributions.push(dist);
      }

      // Box 19b: Other property distributions
      const box19b = allocation.allocatedValues['19b'];
      if (box19b && box19b !== 0) {
        const dist = await this.prismaService.distribution.create({
          data: {
            partnershipId: session.partnershipId,
            entityId: allocation.entityId,
            type: 'RETURN_OF_CAPITAL',
            amount: box19b,
            date: distributionDate,
            currency: 'USD',
            notes: `K-1 Box 19b (Property distributions) - Tax Year ${session.taxYear}`
          }
        });
        distributions.push(dist);
      }
    }

    // Update session to CONFIRMED and link KDocument
    await this.prismaService.k1ImportSession.update({
      where: { id: sessionId },
      data: {
        status: K1ImportStatus.CONFIRMED,
        kDocumentId: kDocument.id
      }
    });

    this.logger.log(
      `Session ${sessionId}: Confirmed. KDocument ${kDocument.id} created, ${distributions.length} distributions, ${allocations.length} member allocations`
    );

    return {
      importSession: {
        id: sessionId,
        status: 'CONFIRMED'
      },
      kDocument: {
        id: kDocument.id,
        partnershipId: kDocument.partnershipId,
        type: kDocument.type,
        taxYear: kDocument.taxYear,
        filingStatus: kDocument.filingStatus,
        data: kDocument.data
      },
      distributions,
      allocations: allocations.map((a) => ({
        entityId: a.entityId,
        entityName: a.entityName,
        ownershipPercent: a.ownershipPercent,
        allocatedValues: a.allocatedValues
      })),
      document: session.documentId
        ? { id: session.documentId, type: 'K1', name: session.fileName }
        : null
    };
  }

  /**
   * Check if a PDF is password-protected (FR-029).
   */
  private async checkPasswordProtected(buffer: Buffer): Promise<void> {
    try {
      const pdfParse = await import('pdf-parse');
      await pdfParse.default(buffer);
    } catch (error) {
      if (
        error?.message?.includes('password') ||
        error?.message?.includes('encrypted')
      ) {
        throw new HttpException(
          'Password-protected PDFs are not supported',
          StatusCodes.BAD_REQUEST
        );
      }
      // Other parse errors are not password-related, continue
    }
  }
}
