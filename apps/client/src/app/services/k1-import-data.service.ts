import type {
  K1ImportSessionSummary
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

  // ── K1 Box Definition Endpoints ─────────────────────────────────

  /**
   * Fetch all K1 box definitions (IRS reference data).
   * GET /api/v1/k1/box-definitions
   */
  public fetchBoxDefinitions(section?: string): Observable<any[]> {
    let httpParams = new HttpParams();

    if (section) {
      httpParams = httpParams.set('section', section);
    }

    return this.http.get<any[]>('/api/v1/k1/box-definitions', {
      params: httpParams
    });
  }

  /**
   * Fetch all default aggregation rules.
   * GET /api/v1/k1/box-definitions/aggregation-rules
   */
  public fetchAggregationRules(): Observable<any[]> {
    return this.http.get<any[]>('/api/v1/k1/box-definitions/aggregation-rules');
  }
}
