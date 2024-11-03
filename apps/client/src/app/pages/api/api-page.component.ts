import { LookupItem } from '@ghostfolio/api/app/symbol/interfaces/lookup-item.interface';
import { DataProviderGhostfolioStatusResponse } from '@ghostfolio/common/interfaces';

import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { map, Observable, Subject, takeUntil } from 'rxjs';

@Component({
  host: { class: 'page' },
  imports: [CommonModule],
  selector: 'gf-api-page',
  standalone: true,
  styleUrls: ['./api-page.scss'],
  templateUrl: './api-page.html'
})
export class GfApiPageComponent implements OnInit {
  public status$: Observable<DataProviderGhostfolioStatusResponse>;
  public symbols$: Observable<LookupItem[]>;

  private unsubscribeSubject = new Subject<void>();

  public constructor(private http: HttpClient) {}

  public ngOnInit() {
    this.status$ = this.fetchStatus();
    this.symbols$ = this.fetchSymbols({ query: 'apple' });
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  private fetchStatus() {
    return this.http
      .get<DataProviderGhostfolioStatusResponse>(
        '/api/v1/data-providers/ghostfolio/status'
      )
      .pipe(takeUntil(this.unsubscribeSubject));
  }

  private fetchSymbols({
    includeIndices = false,
    query
  }: {
    includeIndices?: boolean;
    query: string;
  }) {
    let params = new HttpParams().set('query', query);

    if (includeIndices) {
      params = params.append('includeIndices', includeIndices);
    }

    return this.http
      .get<{
        items: LookupItem[];
      }>('/api/v1/data-providers/ghostfolio/lookup', { params })
      .pipe(
        map(({ items }) => {
          return items;
        }),
        takeUntil(this.unsubscribeSubject)
      );
  }
}
