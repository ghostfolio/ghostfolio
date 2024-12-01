import { DATE_FORMAT } from '@ghostfolio/common/helper';
import {
  DataProviderGhostfolioStatusResponse,
  DividendsResponse,
  HistoricalResponse,
  LookupResponse,
  QuotesResponse
} from '@ghostfolio/common/interfaces';

import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { format, startOfYear } from 'date-fns';
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
  public dividends$: Observable<DividendsResponse['dividends']>;
  public historicalData$: Observable<HistoricalResponse['historicalData']>;
  public quotes$: Observable<QuotesResponse['quotes']>;
  public status$: Observable<DataProviderGhostfolioStatusResponse>;
  public symbols$: Observable<LookupResponse['items']>;

  private unsubscribeSubject = new Subject<void>();

  public constructor(private http: HttpClient) {}

  public ngOnInit() {
    this.dividends$ = this.fetchDividends({ symbol: 'KO' });
    this.historicalData$ = this.fetchHistoricalData({ symbol: 'AAPL.US' });
    this.quotes$ = this.fetchQuotes({ symbols: ['AAPL.US', 'VOO.US'] });
    this.status$ = this.fetchStatus();
    this.symbols$ = this.fetchSymbols({ query: 'apple' });
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  private fetchDividends({ symbol }: { symbol: string }) {
    const params = new HttpParams()
      .set('from', format(startOfYear(new Date()), DATE_FORMAT))
      .set('to', format(new Date(), DATE_FORMAT));

    return this.http
      .get<DividendsResponse>(
        `/api/v1/data-providers/ghostfolio/dividends/${symbol}`,
        { params }
      )
      .pipe(
        map(({ dividends }) => {
          return dividends;
        }),
        takeUntil(this.unsubscribeSubject)
      );
  }

  private fetchHistoricalData({ symbol }: { symbol: string }) {
    const params = new HttpParams()
      .set('from', format(startOfYear(new Date()), DATE_FORMAT))
      .set('to', format(new Date(), DATE_FORMAT));

    return this.http
      .get<HistoricalResponse>(
        `/api/v1/data-providers/ghostfolio/historical/${symbol}`,
        { params }
      )
      .pipe(
        map(({ historicalData }) => {
          return historicalData;
        }),
        takeUntil(this.unsubscribeSubject)
      );
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
