import {
  IDistributionListResponse,
  IEntity,
  IEntityPortfolio,
  IEntityWithRelations,
  IFamilyOfficeDashboard,
  IFamilyOfficeReport,
  IKDocument,
  IPartnership,
  IPartnershipDetail,
  IPartnershipPerformance,
  IPartnershipValuation
} from '@ghostfolio/common/interfaces';

import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FamilyOfficeDataService {
  public constructor(private http: HttpClient) {}

  // Entity endpoints
  public createEntity(data: {
    name: string;
    type: string;
    taxId?: string;
  }): Observable<IEntity> {
    return this.http.post<IEntity>('/api/v1/entity', data);
  }

  public fetchEntities(params?: { type?: string }): Observable<IEntity[]> {
    let httpParams = new HttpParams();
    if (params?.type) {
      httpParams = httpParams.set('type', params.type);
    }
    return this.http.get<IEntity[]>('/api/v1/entity', { params: httpParams });
  }

  public fetchEntity(entityId: string): Observable<IEntityWithRelations> {
    return this.http.get<IEntityWithRelations>(`/api/v1/entity/${entityId}`);
  }

  public updateEntity(
    entityId: string,
    data: { name?: string; taxId?: string }
  ): Observable<IEntity> {
    return this.http.put<IEntity>(`/api/v1/entity/${entityId}`, data);
  }

  public deleteEntity(entityId: string): Observable<void> {
    return this.http.delete<void>(`/api/v1/entity/${entityId}`);
  }

  public fetchEntityPortfolio(
    entityId: string,
    params?: { dateRange?: string }
  ): Observable<IEntityPortfolio> {
    let httpParams = new HttpParams();
    if (params?.dateRange) {
      httpParams = httpParams.set('dateRange', params.dateRange);
    }
    return this.http.get<IEntityPortfolio>(
      `/api/v1/entity/${entityId}/portfolio`,
      { params: httpParams }
    );
  }

  public createOwnership(
    entityId: string,
    data: {
      accountId: string;
      ownershipPercent: number;
      effectiveDate: string;
      acquisitionDate?: string;
      costBasis?: number;
    }
  ): Observable<any> {
    return this.http.post(`/api/v1/entity/${entityId}/ownership`, data);
  }

  public fetchEntityDistributions(
    entityId: string,
    params?: { startDate?: string; endDate?: string; groupBy?: string }
  ): Observable<IDistributionListResponse> {
    let httpParams = new HttpParams();
    if (params?.startDate) {
      httpParams = httpParams.set('startDate', params.startDate);
    }
    if (params?.endDate) {
      httpParams = httpParams.set('endDate', params.endDate);
    }
    if (params?.groupBy) {
      httpParams = httpParams.set('groupBy', params.groupBy);
    }
    return this.http.get<IDistributionListResponse>(
      `/api/v1/entity/${entityId}/distributions`,
      { params: httpParams }
    );
  }

  public fetchEntityKDocuments(
    entityId: string,
    params?: { taxYear?: number }
  ): Observable<any[]> {
    let httpParams = new HttpParams();
    if (params?.taxYear) {
      httpParams = httpParams.set('taxYear', params.taxYear.toString());
    }
    return this.http.get<any[]>(`/api/v1/entity/${entityId}/k-documents`, {
      params: httpParams
    });
  }

  // Partnership endpoints
  public createPartnership(data: {
    name: string;
    type: string;
    inceptionDate: string;
    fiscalYearEnd?: number;
    currency: string;
  }): Observable<IPartnership> {
    return this.http.post<IPartnership>('/api/v1/partnership', data);
  }

  public fetchPartnerships(): Observable<IPartnership[]> {
    return this.http.get<IPartnership[]>('/api/v1/partnership');
  }

  public fetchPartnership(
    partnershipId: string
  ): Observable<IPartnershipDetail> {
    return this.http.get<IPartnershipDetail>(
      `/api/v1/partnership/${partnershipId}`
    );
  }

  public updatePartnership(
    partnershipId: string,
    data: { name?: string; fiscalYearEnd?: number }
  ): Observable<IPartnership> {
    return this.http.put<IPartnership>(
      `/api/v1/partnership/${partnershipId}`,
      data
    );
  }

  public deletePartnership(partnershipId: string): Observable<void> {
    return this.http.delete<void>(`/api/v1/partnership/${partnershipId}`);
  }

  public addPartnershipMember(
    partnershipId: string,
    data: {
      entityId: string;
      ownershipPercent: number;
      capitalCommitment?: number;
      capitalContributed?: number;
      classType?: string;
      effectiveDate: string;
    }
  ): Observable<any> {
    return this.http.post(`/api/v1/partnership/${partnershipId}/member`, data);
  }

  public updatePartnershipMember(
    partnershipId: string,
    membershipId: string,
    data: Record<string, unknown>
  ): Observable<any> {
    return this.http.put(
      `/api/v1/partnership/${partnershipId}/member/${membershipId}`,
      data
    );
  }

  public createPartnershipValuation(
    partnershipId: string,
    data: { date: string; nav: number; source: string; notes?: string }
  ): Observable<IPartnershipValuation> {
    return this.http.post<IPartnershipValuation>(
      `/api/v1/partnership/${partnershipId}/valuation`,
      data
    );
  }

  public fetchPartnershipValuations(
    partnershipId: string,
    params?: { startDate?: string; endDate?: string }
  ): Observable<IPartnershipValuation[]> {
    let httpParams = new HttpParams();
    if (params?.startDate) {
      httpParams = httpParams.set('startDate', params.startDate);
    }
    if (params?.endDate) {
      httpParams = httpParams.set('endDate', params.endDate);
    }
    return this.http.get<IPartnershipValuation[]>(
      `/api/v1/partnership/${partnershipId}/valuations`,
      { params: httpParams }
    );
  }

  public addPartnershipAsset(
    partnershipId: string,
    data: {
      name: string;
      assetType: string;
      description?: string;
      acquisitionDate?: string;
      acquisitionCost?: number;
      currentValue?: number;
      currency: string;
      metadata?: Record<string, unknown>;
    }
  ): Observable<any> {
    return this.http.post(`/api/v1/partnership/${partnershipId}/asset`, data);
  }

  public addAssetValuation(
    partnershipId: string,
    assetId: string,
    data: { date: string; value: number; source: string; notes?: string }
  ): Observable<any> {
    return this.http.post(
      `/api/v1/partnership/${partnershipId}/asset/${assetId}/valuation`,
      data
    );
  }

  public fetchPartnershipPerformance(
    partnershipId: string,
    params?: {
      periodicity?: string;
      benchmarks?: string;
      startDate?: string;
      endDate?: string;
    }
  ): Observable<IPartnershipPerformance> {
    let httpParams = new HttpParams();
    if (params?.periodicity) {
      httpParams = httpParams.set('periodicity', params.periodicity);
    }
    if (params?.benchmarks) {
      httpParams = httpParams.set('benchmarks', params.benchmarks);
    }
    if (params?.startDate) {
      httpParams = httpParams.set('startDate', params.startDate);
    }
    if (params?.endDate) {
      httpParams = httpParams.set('endDate', params.endDate);
    }
    return this.http.get<IPartnershipPerformance>(
      `/api/v1/partnership/${partnershipId}/performance`,
      { params: httpParams }
    );
  }

  // Distribution endpoints
  public createDistribution(data: {
    partnershipId?: string;
    entityId: string;
    type: string;
    amount: number;
    date: string;
    currency: string;
    taxWithheld?: number;
    notes?: string;
  }): Observable<any> {
    return this.http.post('/api/v1/distribution', data);
  }

  public fetchDistributions(params?: {
    entityId?: string;
    partnershipId?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
    groupBy?: string;
  }): Observable<IDistributionListResponse> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value) {
          httpParams = httpParams.set(key, value);
        }
      });
    }
    return this.http.get<IDistributionListResponse>('/api/v1/distribution', {
      params: httpParams
    });
  }

  public deleteDistribution(distributionId: string): Observable<void> {
    return this.http.delete<void>(`/api/v1/distribution/${distributionId}`);
  }

  // K-Document endpoints
  public createKDocument(data: {
    partnershipId: string;
    type: string;
    taxYear: number;
    filingStatus?: string;
    data: Record<string, number>;
  }): Observable<IKDocument> {
    return this.http.post<IKDocument>('/api/v1/k-document', data);
  }

  public fetchKDocuments(params?: {
    partnershipId?: string;
    taxYear?: number;
    type?: string;
    filingStatus?: string;
  }): Observable<IKDocument[]> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          httpParams = httpParams.set(key, value.toString());
        }
      });
    }
    return this.http.get<IKDocument[]>('/api/v1/k-document', {
      params: httpParams
    });
  }

  public updateKDocument(
    kDocumentId: string,
    data: { filingStatus?: string; data?: Record<string, number> }
  ): Observable<IKDocument> {
    return this.http.put<IKDocument>(`/api/v1/k-document/${kDocumentId}`, data);
  }

  public linkDocumentToKDocument(
    kDocumentId: string,
    documentId: string
  ): Observable<IKDocument> {
    return this.http.post<IKDocument>(
      `/api/v1/k-document/${kDocumentId}/link-document`,
      { documentId }
    );
  }

  // Upload endpoints
  public uploadDocument(formData: FormData): Observable<any> {
    return this.http.post('/api/v1/upload', formData);
  }

  public downloadDocument(documentId: string): Observable<Blob> {
    return this.http.get(`/api/v1/upload/${documentId}/download`, {
      responseType: 'blob'
    });
  }

  // Family Office endpoints
  public fetchDashboard(): Observable<IFamilyOfficeDashboard> {
    return this.http.get<IFamilyOfficeDashboard>(
      '/api/v1/family-office/dashboard'
    );
  }

  public fetchReport(params: {
    period: string;
    year: number;
    periodNumber?: number;
    entityId?: string;
    benchmarks?: string;
  }): Observable<IFamilyOfficeReport> {
    let httpParams = new HttpParams()
      .set('period', params.period)
      .set('year', params.year.toString());

    if (params.periodNumber) {
      httpParams = httpParams.set(
        'periodNumber',
        params.periodNumber.toString()
      );
    }
    if (params.entityId) {
      httpParams = httpParams.set('entityId', params.entityId);
    }
    if (params.benchmarks) {
      httpParams = httpParams.set('benchmarks', params.benchmarks);
    }
    return this.http.get<IFamilyOfficeReport>('/api/v1/family-office/report', {
      params: httpParams
    });
  }
}
