import { K1ImportDataService } from '@ghostfolio/client/services/k1-import-data.service';

import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { ActivatedRoute, Router } from '@angular/router';

interface ConfirmationResult {
  importSession: { id: string; status: string };
  kDocument: {
    id: string;
    partnershipId: string;
    type: string;
    taxYear: number;
    filingStatus: string;
    data: Record<string, number | null>;
  };
  distributions: Array<{
    id: string;
    entityId: string;
    type: string;
    amount: number;
    date: string;
  }>;
  allocations: Array<{
    entityId: string;
    entityName: string;
    ownershipPercent: number;
    allocatedValues: Record<string, number>;
  }>;
  document: { id: string; type: string; name: string } | null;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'page' },
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatProgressBarModule,
    MatSelectModule,
    MatTableModule
  ],
  selector: 'gf-k1-confirmation',
  styleUrls: ['./k1-confirmation.scss'],
  templateUrl: './k1-confirmation.html'
})
export class K1ConfirmationComponent implements OnInit {
  public error: string | null = null;
  public filingStatus: 'DRAFT' | 'ESTIMATED' | 'FINAL' = 'DRAFT';
  public filingStatusOptions = ['DRAFT', 'ESTIMATED', 'FINAL'];
  public existingKDocumentAction: 'UPDATE' | 'CREATE_NEW' | null = null;
  public hasConflict = false;
  public isConfirming = false;
  public isLoading = true;
  public result: ConfirmationResult | null = null;
  public sessionId: string;
  public sessionStatus: string;

  public allocationColumns = [
    'entityName',
    'ownershipPercent',
    'allocatedValues'
  ];

  public distributionColumns = ['entityId', 'type', 'amount', 'date'];

  public constructor(
    private readonly activatedRoute: ActivatedRoute,
    private readonly changeDetectorRef: ChangeDetectorRef,
    private readonly destroyRef: DestroyRef,
    private readonly k1ImportDataService: K1ImportDataService,
    private readonly router: Router
  ) {}

  public ngOnInit(): void {
    this.sessionId = this.activatedRoute.snapshot.params['id'];
    this.loadSession();
  }

  /**
   * Confirm the verified K-1 data.
   */
  public confirmImport(): void {
    this.isConfirming = true;
    this.error = null;
    this.changeDetectorRef.markForCheck();

    const data: any = {
      filingStatus: this.filingStatus
    };

    if (this.existingKDocumentAction) {
      data.existingKDocumentAction = this.existingKDocumentAction;
    }

    this.k1ImportDataService
      .confirmImportSession(this.sessionId, data)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: ConfirmationResult) => {
          this.result = res;
          this.isConfirming = false;
          this.changeDetectorRef.markForCheck();
        },
        error: (err) => {
          this.isConfirming = false;

          // Handle conflict (409) — existing KDocument
          if (err?.status === 409) {
            this.hasConflict = true;
            this.error =
              'A KDocument already exists for this partnership and tax year. Choose an action below.';
          } else {
            this.error =
              err?.error?.message || err?.message || 'Confirmation failed.';
          }

          this.changeDetectorRef.markForCheck();
        }
      });
  }

  /**
   * Navigate back to the K-1 import list.
   */
  public goToImportList(): void {
    this.router.navigate(['/k1-import']);
  }

  /**
   * Navigate to the created KDocument detail.
   */
  public viewKDocument(): void {
    if (this.result?.kDocument?.id) {
      this.router.navigate([
        '/k-documents',
        this.result.kDocument.id
      ]);
    }
  }

  /**
   * Cancel and go back to verification.
   */
  public goBackToVerify(): void {
    this.router.navigate(['/k1-import', this.sessionId, 'verify']);
  }

  private loadSession(): void {
    this.k1ImportDataService
      .fetchImportSession(this.sessionId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (session: any) => {
          this.sessionStatus = session.status;

          if (session.status === 'CONFIRMED') {
            // Already confirmed — show result view
            this.result = {
              importSession: { id: session.id, status: session.status },
              kDocument: session.kDocumentId
                ? {
                    id: session.kDocumentId,
                    partnershipId: session.partnershipId,
                    type: 'K1',
                    taxYear: session.taxYear,
                    filingStatus: '',
                    data: {}
                  }
                : null,
              distributions: [],
              allocations: [],
              document: null
            } as any;
          } else if (session.status !== 'VERIFIED') {
            this.error = `Session is in ${session.status} status. Must be VERIFIED to confirm.`;
          }

          this.isLoading = false;
          this.changeDetectorRef.markForCheck();
        },
        error: (err) => {
          this.error =
            err?.error?.message || err?.message || 'Failed to load session.';
          this.isLoading = false;
          this.changeDetectorRef.markForCheck();
        }
      });
  }
}
