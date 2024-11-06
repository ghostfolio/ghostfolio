import {
  DataProviderGhostfolioStatusResponse,
  LookupResponse,
  QuotesResponse
} from '@ghostfolio/common/interfaces';

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
  public quotes$: Observable<QuotesResponse['quotes']>;
  public status$: Observable<DataProviderGhostfolioStatusResponse>;
  public symbols$: Observable<LookupResponse['items']>;

  private unsubscribeSubject = new Subject<void>();

  public constructor(private http: HttpClient) {}

  public ngOnInit() {
    this.quotes$ = this.fetchQuotes({ symbols: ['AAPL.US', 'VOO.US'] });
    this.status$ = this.fetchStatus();
    this.symbols$ = this.fetchSymbols({ query: 'apple' });
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  private fetchQuotes({ symbols }: { symbols: string[] }) {
    const params = new HttpParams().set('symbols', symbols.join(','));

    return this.http
      .get<QuotesResponse>('/api/v1/data-providers/ghostfolio/quotes', {
        params
      })
      .pipe(
        map(({ quotes }) => {
          return quotes;
        }),
        takeUntil(this.unsubscribeSubject)
      );
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
      .get<LookupResponse>('/api/v1/data-providers/ghostfolio/lookup', {
        params
      })
      .pipe(
        map(({ items }) => {
          return items;
        }),
        takeUntil(this.unsubscribeSubject)
      );
  }
}
