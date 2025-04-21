import {
  HEADER_KEY_SKIP_INTERCEPTOR,
  HEADER_KEY_TOKEN
} from '@ghostfolio/common/config';
import { DATE_FORMAT } from '@ghostfolio/common/helper';
import {
  DataProviderGhostfolioStatusResponse,
  DividendsResponse,
  HistoricalResponse,
  LookupResponse,
  QuotesResponse
} from '@ghostfolio/common/interfaces';

import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { format, startOfYear } from 'date-fns';
import { map, Observable, Subject, takeUntil } from 'rxjs';

@Component({
  host: { class: 'page' },
  imports: [CommonModule],
  selector: 'gf-api-page',
  styleUrls: ['./api-page.scss'],
  templateUrl: './api-page.html'
})
export class GfApiPageComponent implements OnInit {
  public dividends$: Observable<DividendsResponse['dividends']>;
  public historicalData$: Observable<HistoricalResponse['historicalData']>;
  public isinLookupItems$: Observable<LookupResponse['items']>;
  public lookupItems$: Observable<LookupResponse['items']>;
  public quotes$: Observable<QuotesResponse['quotes']>;
  public status$: Observable<DataProviderGhostfolioStatusResponse>;

  private apiKey: string;
  private unsubscribeSubject = new Subject<void>();

  public constructor(private http: HttpClient) {}

  public ngOnInit() {
    this.apiKey = prompt($localize`Please enter your Ghostfolio API key:`);

    this.dividends$ = this.fetchDividends({ symbol: 'KO' });
    this.historicalData$ = this.fetchHistoricalData({ symbol: 'AAPL' });
    this.isinLookupItems$ = this.fetchLookupItems({ query: 'US0378331005' });
    this.quotes$ = this.fetchQuotes({ symbols: ['AAPL', 'VOO.US'] });
    this.status$ = this.fetchStatus();
    this.lookupItems$ = this.fetchLookupItems({ query: 'apple' });
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
        `/api/v2/data-providers/ghostfolio/dividends/${symbol}`,
        {
          params,
          headers: this.getHeaders()
        }
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
        `/api/v2/data-providers/ghostfolio/historical/${symbol}`,
        {
          params,
          headers: this.getHeaders()
        }
      )
      .pipe(
        map(({ historicalData }) => {
          return historicalData;
        }),
        takeUntil(this.unsubscribeSubject)
      );
  }

  private fetchLookupItems({
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
      .get<LookupResponse>('/api/v2/data-providers/ghostfolio/lookup', {
        params,
        headers: this.getHeaders()
      })
      .pipe(
        map(({ items }) => {
          return items;
        }),
        takeUntil(this.unsubscribeSubject)
      );
  }

  private fetchQuotes({ symbols }: { symbols: string[] }) {
    const params = new HttpParams().set('symbols', symbols.join(','));

    return this.http
      .get<QuotesResponse>('/api/v2/data-providers/ghostfolio/quotes', {
        params,
        headers: this.getHeaders()
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
        '/api/v2/data-providers/ghostfolio/status',
        { headers: this.getHeaders() }
      )
      .pipe(takeUntil(this.unsubscribeSubject));
  }

  private getHeaders() {
    return new HttpHeaders({
      [HEADER_KEY_SKIP_INTERCEPTOR]: 'true',
      [HEADER_KEY_TOKEN]: `Api-Key ${this.apiKey}`
    });
  }
}
