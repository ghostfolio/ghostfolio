import type {
  K1ExtractionResult,
  K1ImportSessionSummary,
  K1AggregationResult
} from '@ghostfolio/common/interfaces';
import type {
  ConfirmK1ImportDto,
  VerifyK1ImportDto
} from '@ghostfolio/common/dtos';

import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class K1ImportDataService {
  public constructor(private http: HttpClient) {}

  // ── K1 Import Endpoints ──────────────────────────────────────────

  /**
   * Upload a K-1 PDF and initiate extraction.
   * POST /api/v1/k1-import/upload
   */
  public uploadK1(formData: FormData): Observable<any> {
    return this.http.post('/api/v1/k1-import/upload', formData);
  }

  /**
   * Get the current state of an import session.
   * GET /api/v1/k1-import/:id
   */
  public fetchImportSession(sessionId: string): Observable<any> {
    return this.http.get(`/api/v1/k1-import/${sessionId}`);
  }

  /**
   * Submit user-verified extraction data.
   * PUT /api/v1/k1-import/:id/verify
   */
  public verifyImportSession(
    sessionId: string,
    data: VerifyK1ImportDto
  ): Observable<any> {
    return this.http.put(`/api/v1/k1-import/${sessionId}/verify`, data);
  }

  /**
   * Confirm verified data and trigger auto-creation of model objects.
   * POST /api/v1/k1-import/:id/confirm
   */
  public confirmImportSession(
    sessionId: string,
    data: ConfirmK1ImportDto
  ): Observable<any> {
    return this.http.post(`/api/v1/k1-import/${sessionId}/confirm`, data);
  }

  /**
   * Cancel an import session.
   * POST /api/v1/k1-import/:id/cancel
   */
  public cancelImportSession(sessionId: string): Observable<any> {
    return this.http.post(`/api/v1/k1-import/${sessionId}/cancel`, {});
  }

  /**
   * List import sessions for a partnership.
   * GET /api/v1/k1-import/history
   */
  public fetchImportHistory(params: {
    partnershipId: string;
    taxYear?: number;
  }): Observable<K1ImportSessionSummary[]> {
    let httpParams = new HttpParams().set(
      'partnershipId',
      params.partnershipId
    );

    if (params.taxYear) {
      httpParams = httpParams.set('taxYear', params.taxYear.toString());
    }

    return this.http.get<K1ImportSessionSummary[]>(
      '/api/v1/k1-import/history',
      { params: httpParams }
    );
  }

  /**
   * Re-run extraction on a previously uploaded PDF.
   * POST /api/v1/k1-import/:id/reprocess
   */
  public reprocessImportSession(sessionId: string): Observable<any> {
    return this.http.post(`/api/v1/k1-import/${sessionId}/reprocess`, {});
  }

  // ── Cell Mapping Endpoints ───────────────────────────────────────

  /**
   * Get cell mappings for a partnership (with global defaults).
   * GET /api/v1/cell-mapping
   */
  public fetchCellMappings(partnershipId?: string): Observable<any[]> {
    let httpParams = new HttpParams();

    if (partnershipId) {
      httpParams = httpParams.set('partnershipId', partnershipId);
    }

    return this.http.get<any[]>('/api/v1/cell-mapping', {
      params: httpParams
    });
  }

  /**
   * Update or create cell mappings for a partnership.
   * PUT /api/v1/cell-mapping
   */
  public updateCellMappings(data: {
    partnershipId: string;
    mappings: Array<{
      boxNumber: string;
      label: string;
      description?: string;
      isCustom: boolean;
    }>;
  }): Observable<any[]> {
    return this.http.put<any[]>('/api/v1/cell-mapping', data);
  }

  /**
   * Reset a partnership's cell mappings to IRS defaults.
   * DELETE /api/v1/cell-mapping/reset
   */
  public resetCellMappings(partnershipId: string): Observable<void> {
    const httpParams = new HttpParams().set('partnershipId', partnershipId);

    return this.http.delete<void>('/api/v1/cell-mapping/reset', {
      params: httpParams
    });
  }

  // ── Aggregation Rule Endpoints ───────────────────────────────────

  /**
   * Get aggregation rules for a partnership.
   * GET /api/v1/cell-mapping/aggregation-rules
   */
  public fetchAggregationRules(partnershipId?: string): Observable<any[]> {
    let httpParams = new HttpParams();

    if (partnershipId) {
      httpParams = httpParams.set('partnershipId', partnershipId);
    }

    return this.http.get<any[]>('/api/v1/cell-mapping/aggregation-rules', {
      params: httpParams
    });
  }

  /**
   * Create or update aggregation rules for a partnership.
   * PUT /api/v1/cell-mapping/aggregation-rules
   */
  public updateAggregationRules(data: {
    partnershipId: string;
    rules: Array<{
      name: string;
      operation: string;
      sourceCells: string[];
    }>;
  }): Observable<any[]> {
    return this.http.put<any[]>(
      '/api/v1/cell-mapping/aggregation-rules',
      data
    );
  }

  /**
   * Compute aggregation values for a specific KDocument.
   * GET /api/v1/cell-mapping/aggregation-rules/compute
   */
  public computeAggregations(params: {
    kDocumentId: string;
    partnershipId?: string;
  }): Observable<K1AggregationResult[]> {
    let httpParams = new HttpParams().set('kDocumentId', params.kDocumentId);

    if (params.partnershipId) {
      httpParams = httpParams.set('partnershipId', params.partnershipId);
    }

    return this.http.get<K1AggregationResult[]>(
      '/api/v1/cell-mapping/aggregation-rules/compute',
      { params: httpParams }
    );
  }
}
