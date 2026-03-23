import { HttpClient } from '@angular/common/http';
import { Injectable, NgZone } from '@angular/core';
import { Observable, Subject } from 'rxjs';

declare global {
  interface Window {
    Plaid: {
      create: (config: PlaidLinkConfig) => PlaidLinkHandler;
    };
  }
}

interface PlaidLinkConfig {
  token: string;
  onSuccess: (publicToken: string, metadata: PlaidLinkMetadata) => void;
  onExit: (err: any, metadata: any) => void;
  onEvent?: (eventName: string, metadata: any) => void;
}

interface PlaidLinkHandler {
  open: () => void;
  destroy: () => void;
}

export interface PlaidLinkMetadata {
  institution: {
    institution_id: string;
    name: string;
  };
  accounts: {
    id: string;
    name: string;
    type: string;
    subtype: string;
    mask: string;
  }[];
  link_session_id: string;
}

export interface PlaidLinkResult {
  publicToken: string;
  metadata: PlaidLinkMetadata;
}

export interface PlaidLinkTokenResponse {
  linkToken: string;
  expiration: string;
}

export interface PlaidExchangeTokenRequest {
  publicToken: string;
  institutionId: string;
  institutionName: string;
  accounts: {
    id: string;
    name: string;
    type: string;
    subtype: string;
    mask: string;
  }[];
}

export interface PlaidExchangeTokenResponse {
  plaidItemId: string;
  accounts: {
    accountId: string;
    plaidAccountId: string;
    name: string;
  }[];
}

export interface PlaidItemSummary {
  id: string;
  institutionId: string | null;
  institutionName: string | null;
  lastSyncedAt: string | null;
  error: string | null;
  consentExpiresAt: string | null;
  accountCount: number;
  createdAt: string;
}

export interface PlaidItemsResponse {
  enabled: boolean;
  items: PlaidItemSummary[];
}

@Injectable({
  providedIn: 'root'
})
export class PlaidLinkService {
  private static PLAID_SCRIPT_URL =
    'https://cdn.plaid.com/link/v2/stable/link-initialize.js';
  private scriptLoaded = false;

  public constructor(
    private readonly http: HttpClient,
    private readonly ngZone: NgZone
  ) {}

  public createLinkToken(): Observable<PlaidLinkTokenResponse> {
    return this.http.post<PlaidLinkTokenResponse>(
      '/api/v1/plaid/link-token',
      {}
    );
  }

  public exchangeToken(
    body: PlaidExchangeTokenRequest
  ): Observable<PlaidExchangeTokenResponse> {
    return this.http.post<PlaidExchangeTokenResponse>(
      '/api/v1/plaid/exchange-token',
      body
    );
  }

  public getItems(): Observable<PlaidItemsResponse> {
    return this.http.get<PlaidItemsResponse>('/api/v1/plaid/items');
  }

  public deleteItem(
    plaidItemId: string
  ): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `/api/v1/plaid/items/${plaidItemId}`
    );
  }

  public createUpdateLinkToken(
    plaidItemId: string
  ): Observable<PlaidLinkTokenResponse> {
    return this.http.post<PlaidLinkTokenResponse>(
      `/api/v1/plaid/link-token/update/${plaidItemId}`,
      {}
    );
  }

  public triggerSync(
    plaidItemId: string
  ): Observable<{ jobId: string; message: string }> {
    return this.http.post<{ jobId: string; message: string }>(
      `/api/v1/plaid/sync/${plaidItemId}`,
      {}
    );
  }

  /**
   * Opens the Plaid Link modal with the given token.
   * Returns an Observable that emits the result on success.
   */
  public openPlaidLink(linkToken: string): Observable<PlaidLinkResult> {
    const result$ = new Subject<PlaidLinkResult>();

    this.loadPlaidScript().then(() => {
      const handler = window.Plaid.create({
        token: linkToken,
        onSuccess: (publicToken, metadata) => {
          this.ngZone.run(() => {
            result$.next({ publicToken, metadata });
            result$.complete();
          });
          handler.destroy();
        },
        onExit: (err) => {
          this.ngZone.run(() => {
            if (err) {
              result$.error(err);
            } else {
              result$.complete();
            }
          });
          handler.destroy();
        }
      });
      handler.open();
    });

    return result$.asObservable();
  }

  private loadPlaidScript(): Promise<void> {
    if (this.scriptLoaded) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = PlaidLinkService.PLAID_SCRIPT_URL;
      script.onload = () => {
        this.scriptLoaded = true;
        resolve();
      };
      script.onerror = () => reject(new Error('Failed to load Plaid script'));
      document.head.appendChild(script);
    });
  }
}
