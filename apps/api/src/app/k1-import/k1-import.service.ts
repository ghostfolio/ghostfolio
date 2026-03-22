import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import type { K1ExtractionResult } from '@ghostfolio/common/interfaces';

import { HttpException, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { K1ImportStatus, KDocumentStatus } from '@prisma/client';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { UploadService } from '../upload/upload.service';
import { K1BoxDefinitionService } from '../k1-box-definition/k1-box-definition.service';
import { AzureExtractor } from './extractors/azure-extractor';
import { PdfParseExtractor } from './extractors/pdf-parse-extractor';
import { TesseractExtractor } from './extractors/tesseract-extractor';
import { K1AllocationService } from './k1-allocation.service';
import { K1FieldMapperService } from './k1-field-mapper.service';

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

@Injectable()
export class K1ImportService {
  private readonly logger = new Logger(K1ImportService.name);

  public constructor(
    private readonly prismaService: PrismaService,
    private readonly uploadService: UploadService,
    private readonly fieldMapperService: K1FieldMapperService,
    private readonly allocationService: K1AllocationService,
    private readonly k1BoxDefinitionService: K1BoxDefinitionService,
    private readonly eventEmitter: EventEmitter2,
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
        members: {
          where: {
            endDate: null
          }
        }
      }
    });

    if (!partnership) {
      throw new HttpException(
        'Partnership not found or not owned by user',
        StatusCodes.BAD_REQUEST
      );
    }

    if (!partnership.members || partnership.members.length === 0) {
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

      // Generate edge case warnings (FR-029, Edge Cases 3-6)
      const warnings = await this.generateWarnings(
        sessionId,
        completeResult,
        partnershipId,
        buffer
      );

      if (warnings.length > 0) {
        this.logger.warn(
          `Session ${sessionId}: ${warnings.length} warning(s) detected: ${warnings.join('; ')}`
        );
      }

      // Update session with extraction results and warnings
      await this.prismaService.k1ImportSession.update({
        where: { id: sessionId },
        data: {
          status: K1ImportStatus.EXTRACTED,
          extractionMethod: method,
          rawExtraction: {
            ...completeResult,
            warnings
          } as any
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

    // Transition to VERIFIED and store verified data in rawExtraction
    const currentRaw = (session.rawExtraction as any) || {};
    const updated = await this.prismaService.k1ImportSession.update({
      where: { id: sessionId },
      data: {
        status: K1ImportStatus.VERIFIED,
        taxYear: data.taxYear,
        rawExtraction: {
          ...currentRaw,
          verified: {
            fields: data.fields,
            unmappedItems: data.unmappedItems || []
          }
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
    const relativePath = (document as any).filePath;

    if (!relativePath) {
      throw new HttpException(
        'Cannot determine file path for stored document',
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    const uploadDir = this.uploadService.getUploadDir();
    const fullPath = join(uploadDir, relativePath);
    const fileBuffer = await fs.readFile(fullPath);
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

    const rawExtraction = session.rawExtraction as any;
    const verifiedData = rawExtraction?.verified;
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
        `Partnership has no active members for tax year ${session.taxYear}. ` +
        `Check that membership effectiveDate is on or before ${session.taxYear}-12-31.`,
        StatusCodes.BAD_REQUEST
      );
    }

    // Edge Case 7: Ownership % change handling
    // Compare current memberships with tax year end memberships
    const confirmWarnings: string[] = [];
    const currentMemberships =
      await this.prismaService.partnershipMembership.findMany({
        where: {
          partnershipId: session.partnershipId,
          endDate: null
        },
        include: { entity: true }
      });

    for (const taxYearMember of memberships) {
      const currentMember = currentMemberships.find(
        (cm) => cm.entityId === taxYearMember.entityId
      );
      if (!currentMember) {
        confirmWarnings.push(
          `Member ${taxYearMember.entity?.name || taxYearMember.entityId} was active at tax year end (${session.taxYear}) but is no longer an active member.`
        );
      } else if (
        (currentMember as any).ownershipPercent !==
        (taxYearMember as any).ownershipPercent
      ) {
        confirmWarnings.push(
          `Ownership for ${taxYearMember.entity?.name || taxYearMember.entityId} changed from ${(taxYearMember as any).ownershipPercent}% (tax year ${session.taxYear}) to ${(currentMember as any).ownershipPercent}% (current). Allocations use the tax year end percentage.`
        );
      }
    }

    if (confirmWarnings.length > 0) {
      this.logger.warn(
        `Session ${sessionId}: Confirm warnings: ${confirmWarnings.join('; ')}`
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

    // Build convenience JSON snapshot and K1LineItem data from verified fields
    // The snapshot uses K1Data named fields (see k-document.interface.ts)
    // so that portfolio views can read it directly without box-key translation.
    const boxValues: Record<string, number> = {};
    const kDocumentData: Record<string, number | string | null> = {};
    const lineItemMap = new Map<
      string,
      {
        boxKey: string;
        amount: number | null;
        textValue: string | null;
        rawText: string | null;
        confidence: number | null;
        sourcePage: number | null;
        sourceCoords: any;
        isUserEdited: boolean;
      }
    >();

    for (const field of verifiedData.fields) {
      // For subtype fields (e.g., box 11 "ZZ*", box 20 "A"), create unique key
      const boxKey = field.subtype
        ? `${field.boxNumber}-${field.subtype}`
        : field.boxNumber;

      // FR-017: Auto-create box definition if missing
      await this.k1BoxDefinitionService.autoCreateIfMissing(boxKey, field.label);

      // Collect numeric values by box key for K1Data mapping
      if (field.numericValue !== undefined && field.numericValue !== null) {
        boxValues[boxKey] = field.numericValue;
      }

      // Also keep raw box-key snapshot for debugging
      kDocumentData[boxKey] = field.numericValue ?? field.rawValue ?? null;

      // Build K1LineItem row data — deduplicate by boxKey (take most meaningful value)
      const isNumeric =
        field.numericValue !== undefined && field.numericValue !== null;
      const existing = lineItemMap.get(boxKey);
      const newItem = {
        boxKey,
        amount: isNumeric ? field.numericValue : null,
        textValue: !isNumeric ? String(field.rawValue ?? '') : null,
        rawText: field.rawValue != null ? String(field.rawValue) : null,
        confidence: field.confidence ?? null,
        sourcePage: field.page ?? null,
        sourceCoords: field.boundingBox ?? null,
        isUserEdited: field.isReviewed === true || field.isEdited === true
      };

      if (existing) {
        // Merge: prefer the entry with actual numeric data over empty
        const existingHasValue = existing.amount !== null || (existing.textValue && existing.textValue !== '' && existing.textValue !== '.');
        const newHasValue = newItem.amount !== null || (newItem.textValue && newItem.textValue !== '' && newItem.textValue !== '.');

        if (newHasValue && !existingHasValue) {
          lineItemMap.set(boxKey, newItem);
        }
        // Otherwise keep existing (first-wins for equal)
      } else {
        lineItemMap.set(boxKey, newItem);
      }
    }

    const lineItemsToCreate = Array.from(lineItemMap.values());

    // Map box keys → K1Data named fields so portfolio views can read directly
    const BOX_KEY_TO_K1DATA_FIELD: Record<string, string> = {
      '1': 'ordinaryIncome',
      '2': 'netRentalIncome',
      '3': 'otherRentalIncome',
      '4': 'guaranteedPayments',     // 4 guaranteed payments (services)
      '4a': 'guaranteedPayments',    // 4a guaranteed payments (capital) — merged
      '4b': 'guaranteedPayments',    // 4b total guaranteed payments — merged
      '5': 'interestIncome',
      '6a': 'dividends',
      '6b': 'qualifiedDividends',
      '7': 'royalties',
      '8': 'capitalGainLossShortTerm',
      '9a': 'capitalGainLossLongTerm',
      '9b': 'collectiblesGain',
      '9c': 'unrecaptured1250Gain',
      '10': 'section1231GainLoss',
      '11': 'otherIncome',
      '12': 'section179Deduction',
      '13': 'otherDeductions',
      '14': 'selfEmploymentEarnings',
      '17': 'alternativeMinimumTaxItems',
      '19a': 'distributionsCash',
      '19b': 'distributionsProperty',
      '21': 'foreignTaxesPaid',
      // Section L: Tax basis / capital account fields
      'L_BEG_CAPITAL': 'beginningTaxBasis',
      'L_CONTRIBUTED': 'k1CapitalAccount',
      'L_END_CAPITAL': 'endingTaxBasis',
    };

    const k1DataSnapshot: Record<string, number | string | null> = {};
    for (const [boxKey, value] of Object.entries(boxValues)) {
      const namedField = BOX_KEY_TO_K1DATA_FIELD[boxKey];
      if (namedField) {
        // If multiple box keys map to same field (e.g., 4a/4b/4c), sum them
        if (k1DataSnapshot[namedField] !== undefined && k1DataSnapshot[namedField] !== null) {
          k1DataSnapshot[namedField] = (k1DataSnapshot[namedField] as number) + value;
        } else {
          k1DataSnapshot[namedField] = value;
        }
      }
    }
    // Merge named fields into the document data (named fields take precedence for views)
    const finalDocumentData = { ...kDocumentData, ...k1DataSnapshot };

    // FR-012: Create or update KDocument with K1LineItems in a single transaction
    // to ensure consistent state (no superseded-but-unreplaced line items).
    let kDocument;
    await this.prismaService.$transaction(async (tx) => {
      if (existingKDocument && data.existingKDocumentAction === 'UPDATE') {
        kDocument = await tx.kDocument.update({
          where: { id: existingKDocument.id },
          data: {
            filingStatus: data.filingStatus,
            data: finalDocumentData as any,
            documentFileId: session.documentId
          }
        });

        // FR-016: Mark existing active K1LineItems as superseded (ESTIMATED→FINAL)
        await tx.k1LineItem.updateMany({
          where: {
            kDocumentId: existingKDocument.id,
            isSuperseded: false
          },
          data: { isSuperseded: true }
        });
      } else {
        // CREATE_NEW or no existing document
        if (existingKDocument && data.existingKDocumentAction === 'CREATE_NEW') {
          // Delete existing unique constraint holder to create new
          await tx.kDocument.delete({
            where: { id: existingKDocument.id }
          });
        }

        kDocument = await tx.kDocument.create({
          data: {
            partnershipId: session.partnershipId,
            type: 'K1',
            taxYear: session.taxYear,
            filingStatus: data.filingStatus,
            data: finalDocumentData as any,
            documentFileId: session.documentId
          }
        });
      }

      // Create K1LineItem rows (the authoritative normalized data)
      if (lineItemsToCreate.length > 0) {
        await tx.k1LineItem.createMany({
          data: lineItemsToCreate.map((item) => ({
            kDocumentId: kDocument.id,
            boxKey: item.boxKey,
            amount: item.amount,
            textValue: item.textValue,
            rawText: item.rawText,
            confidence: item.confidence,
            sourcePage: item.sourcePage,
            sourceCoords: item.sourceCoords,
            isUserEdited: item.isUserEdited,
            isSuperseded: false
          }))
        });

        this.logger.log(
          `Session ${sessionId}: Created ${lineItemsToCreate.length} K1LineItem rows for KDocument ${kDocument.id}`
        );
      }
    });

    // Emit event after the transaction commits to refresh materialized views (US5)
    if (kDocument && lineItemsToCreate.length > 0) {
      this.eventEmitter.emit('k-document.changed', {
        kDocumentId: kDocument.id,
        partnershipId: kDocument.partnershipId
      });
    }

    // FR-013: Allocate K-1 amounts to members
    const allocations = await this.allocationService.allocateToMembers(
      session.partnershipId,
      session.taxYear,
      verifiedData.fields
    );

    // FR-014: Create Distribution records for Box 19a and Box 19b
    // Fallback: if 19a/19b are empty, use box 19 total or L_WITHDRAWALS
    const distributions: any[] = [];
    const distributionDate = new Date(session.taxYear, 11, 31); // Dec 31

    for (const allocation of allocations) {
      // Box 19a: Cash and marketable securities
      let box19a = allocation.allocatedValues['19a'];
      const box19b = allocation.allocatedValues['19b'];

      // Fallback: if 19a and 19b are both empty, use box 19 total or L_WITHDRAWALS as cash distribution
      if ((!box19a || box19a === 0) && (!box19b || box19b === 0)) {
        const box19Total = allocation.allocatedValues['19'];
        const lWithdrawals = allocation.allocatedValues['L_WITHDRAWALS'];
        if (box19Total && box19Total !== 0) {
          box19a = box19Total;
        } else if (lWithdrawals && lWithdrawals !== 0) {
          box19a = lWithdrawals;
        }
      }

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

    // AUTO-POPULATE: Update PartnershipMembership capital fields from K-1 Section L
    // This drives Portfolio Summary (DPI/RVPI/TVPI) computations
    const sectionLData = {
      beginningCapital: boxValues['L_BEG_CAPITAL'] ?? null,
      capitalContributed: boxValues['L_CONTRIBUTED'] ?? null,
      endingCapital: boxValues['L_END_CAPITAL'] ?? null,
      withdrawals: boxValues['L_WITHDRAWALS'] ?? null
    };

    if (sectionLData.beginningCapital !== null || sectionLData.capitalContributed !== null) {
      for (const allocation of allocations) {
        const pct = allocation.ownershipPercent / 100;

        // Compute capitalContributed: beginning + any current year contributions
        const contributed = sectionLData.beginningCapital !== null
          ? Math.round((sectionLData.beginningCapital + (sectionLData.capitalContributed ?? 0)) * pct * 100) / 100
          : null;

        // Compute capitalCommitment: use ending capital as a conservative estimate if not set
        const commitment = sectionLData.endingCapital !== null
          ? Math.round(sectionLData.endingCapital * pct * 100) / 100
          : null;

        try {
          await this.prismaService.partnershipMembership.updateMany({
            where: {
              partnershipId: session.partnershipId,
              entityId: allocation.entityId,
              endDate: null
            },
            data: {
              ...(contributed !== null ? { capitalContributed: contributed } : {}),
              ...(commitment !== null ? { capitalCommitment: commitment } : {})
            }
          });
          this.logger.log(
            `Auto-populated capital for entity ${allocation.entityName}: contributed=${contributed}, commitment=${commitment}`
          );
        } catch (error) {
          this.logger.warn(
            `Failed to update membership capital for ${allocation.entityName}: ${error.message}`
          );
        }
      }
    }

    // AUTO-POPULATE: Create/update PartnershipValuation from K-1 Section L ending capital
    // This drives Dashboard AUM and RVPI calculations
    if (sectionLData.endingCapital !== null) {
      const valuationDate = new Date(session.taxYear, 11, 31); // Dec 31

      try {
        await this.prismaService.partnershipValuation.upsert({
          where: {
            partnershipId_date: {
              partnershipId: session.partnershipId,
              date: valuationDate
            }
          },
          create: {
            partnershipId: session.partnershipId,
            date: valuationDate,
            nav: sectionLData.endingCapital,
            source: 'NAV_STATEMENT',
            notes: `Auto-created from K-1 Section L ending capital account — Tax Year ${session.taxYear}`
          },
          update: {
            nav: sectionLData.endingCapital,
            source: 'NAV_STATEMENT',
            notes: `Auto-updated from K-1 Section L ending capital account — Tax Year ${session.taxYear}`
          }
        });
        this.logger.log(
          `Auto-created PartnershipValuation: partnership=${session.partnershipId}, date=${valuationDate.toISOString()}, nav=${sectionLData.endingCapital}`
        );
      } catch (error) {
        this.logger.warn(
          `Failed to create partnership valuation: ${error.message}`
        );
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
        : null,
      warnings: confirmWarnings
    };
  }

  /**
   * Check if a PDF is password-protected (FR-029).
   */
  private async checkPasswordProtected(buffer: Buffer): Promise<void> {
    try {
      const { PDFParse } = await import('pdf-parse');
      const parser = new PDFParse({ data: buffer });
      await parser.getText();
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

  /**
   * Detect if a PDF contains multiple K-1 forms for different entities (Edge Case 5).
   * Counts occurrences of "Schedule K-1" headers and unique EINs to detect multi-entity PDFs.
   */
  private async detectMultiEntityPdf(buffer: Buffer): Promise<{
    isMultiEntity: boolean;
    entityCount: number;
  }> {
    try {
      const { PDFParse } = await import('pdf-parse');
      const parser = new PDFParse({ data: buffer });
      const parsed = await parser.getText();
      const text = parsed.text || '';

      // Count "Schedule K-1" header occurrences
      const k1HeaderMatches = text.match(/Schedule\s+K-1/gi) || [];
      // Count unique EINs (XX-XXXXXXX format)
      const einMatches = text.match(/\d{2}-\d{7}/g) || [];
      const uniqueEins = new Set(einMatches);

      // If multiple K-1 headers or >2 unique EINs (partnership + multiple partners)
      const entityCount = Math.max(
        Math.floor(k1HeaderMatches.length / 2), // K-1 header appears in header and footer
        uniqueEins.size > 2 ? uniqueEins.size - 1 : 1
      );

      return {
        isMultiEntity: entityCount > 1,
        entityCount: Math.max(entityCount, 1)
      };
    } catch {
      return { isMultiEntity: false, entityCount: 1 };
    }
  }

  /**
   * Generate edge case warnings based on extraction results and session context.
   * Edge cases: EIN mismatch, tax year mismatch, zero-extraction, multi-entity.
   */
  private async generateWarnings(
    sessionId: string,
    extractionResult: K1ExtractionResult,
    partnershipId: string,
    buffer: Buffer
  ): Promise<string[]> {
    const warnings: string[] = [];

    // Edge Case 5: Multi-entity PDF detection
    const multiEntity = await this.detectMultiEntityPdf(buffer);
    if (multiEntity.isMultiEntity) {
      warnings.push(
        `This PDF appears to contain ${multiEntity.entityCount} K-1 forms for different entities. ` +
          'Only the first entity will be processed. Upload separate PDFs for each entity.'
      );
    }

    // Edge Case 3: Zero-extraction warning
    const nonZeroFields = extractionResult.fields.filter(
      (f) => f.numericValue !== null && f.numericValue !== 0
    );
    if (nonZeroFields.length === 0) {
      warnings.push(
        'All extracted values are zero or empty. The PDF may not be readable or may not contain K-1 data. ' +
          'Please verify the PDF quality and try again.'
      );
    }

    // Edge Case 4: EIN mismatch with existing partnership
    const session = await this.prismaService.k1ImportSession.findUnique({
      where: { id: sessionId }
    });
    if (session) {
      const partnership = await this.prismaService.partnership.findUnique({
        where: { id: partnershipId }
      });
      if (partnership && (partnership as any).ein) {
        const extractedEin = extractionResult.fields.find(
          (f) =>
            f.label?.toLowerCase().includes('ein') ||
            f.boxNumber?.toLowerCase() === 'ein'
        );
        if (
          extractedEin?.rawValue &&
          extractedEin.rawValue !== (partnership as any).ein
        ) {
          warnings.push(
            `Extracted EIN (${extractedEin.rawValue}) does not match partnership EIN (${(partnership as any).ein}). ` +
              'Verify you uploaded the correct K-1 for this partnership.'
          );
        }
      }

      // Edge Case 6: Tax year mismatch
      const extractedYear = extractionResult.fields.find(
        (f) =>
          f.label?.toLowerCase().includes('tax year') ||
          f.label?.toLowerCase().includes('calendar year') ||
          f.boxNumber?.toLowerCase() === 'taxyear'
      );
      if (extractedYear?.rawValue) {
        const parsedYear = parseInt(extractedYear.rawValue, 10);
        if (!isNaN(parsedYear) && parsedYear !== session.taxYear) {
          warnings.push(
            `Extracted tax year (${parsedYear}) does not match expected tax year (${session.taxYear}). ` +
              'You can override the tax year during verification if needed.'
          );
        }
      }
    }

    return warnings;
  }
}
