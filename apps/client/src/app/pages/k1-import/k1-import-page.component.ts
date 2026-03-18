import { K1ImportDataService } from '@ghostfolio/client/services/k1-import-data.service';
import { FamilyOfficeDataService } from '@ghostfolio/client/services/family-office-data.service';

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
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  cloudUploadOutline,
  documentTextOutline
} from 'ionicons/icons';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'page' },
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatProgressBarModule,
    MatSelectModule
  ],
  selector: 'gf-k1-import-page',
  styleUrls: ['./k1-import-page.scss'],
  templateUrl: './k1-import-page.html'
})
export class K1ImportPageComponent implements OnInit {
  public error: string | null = null;
  public extractionStatus: string | null = null;
  public isUploading = false;
  public partnerships: Array<{ id: string; name: string }> = [];
  public selectedFile: File | null = null;
  public selectedPartnershipId = '';
  public sessionId: string | null = null;
  public taxYear: number;
  public taxYearOptions: number[] = [];
  public uploadProgress = 0;

  private pollingInterval: any = null;

  public constructor(
    private readonly changeDetectorRef: ChangeDetectorRef,
    private readonly destroyRef: DestroyRef,
    private readonly familyOfficeDataService: FamilyOfficeDataService,
    private readonly k1ImportDataService: K1ImportDataService,
    private readonly router: Router
  ) {
    addIcons({ cloudUploadOutline, documentTextOutline });
    const currentYear = new Date().getFullYear();
    this.taxYear = currentYear - 1;
    for (let y = currentYear; y >= currentYear - 10; y--) {
      this.taxYearOptions.push(y);
    }
  }

  public ngOnInit(): void {
    this.fetchPartnerships();
  }

  public onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      // Client-side validation
      if (file.type !== 'application/pdf') {
        this.error = 'Please select a valid PDF file.';
        this.selectedFile = null;
        this.changeDetectorRef.markForCheck();
        return;
      }

      if (file.size > 25 * 1024 * 1024) {
        this.error = 'File exceeds 25 MB size limit.';
        this.selectedFile = null;
        this.changeDetectorRef.markForCheck();
        return;
      }

      this.error = null;
      this.selectedFile = file;
      this.changeDetectorRef.markForCheck();
    }
  }

  public uploadK1(): void {
    if (!this.selectedFile || !this.selectedPartnershipId || !this.taxYear) {
      this.error = 'Please select a partnership, tax year, and PDF file.';
      this.changeDetectorRef.markForCheck();
      return;
    }

    this.isUploading = true;
    this.error = null;
    this.extractionStatus = 'Uploading...';
    this.changeDetectorRef.markForCheck();

    const formData = new FormData();
    formData.append('file', this.selectedFile);
    formData.append('partnershipId', this.selectedPartnershipId);
    formData.append('taxYear', this.taxYear.toString());

    this.k1ImportDataService
      .uploadK1(formData)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.sessionId = result.id;
          this.extractionStatus = 'Processing...';
          this.isUploading = false;
          this.changeDetectorRef.markForCheck();

          // Start polling for extraction completion
          this.startPolling(result.id);
        },
        error: (err) => {
          this.isUploading = false;
          this.error =
            err?.error?.message || err?.message || 'Upload failed.';
          this.extractionStatus = null;
          this.changeDetectorRef.markForCheck();
        }
      });
  }

  public resetForm(): void {
    this.selectedFile = null;
    this.sessionId = null;
    this.extractionStatus = null;
    this.error = null;
    this.stopPolling();
    this.changeDetectorRef.markForCheck();
  }

  private fetchPartnerships(): void {
    this.familyOfficeDataService
      .fetchPartnerships()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (partnerships) => {
          this.partnerships = partnerships.map((p) => ({
            id: p.id,
            name: p.name
          }));
          this.changeDetectorRef.markForCheck();
        }
      });
  }

  private startPolling(sessionId: string): void {
    this.stopPolling();

    this.pollingInterval = setInterval(() => {
      this.k1ImportDataService
        .fetchImportSession(sessionId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (session) => {
            this.extractionStatus = session.status;

            if (session.status === 'EXTRACTED') {
              this.stopPolling();
              // Navigate to verification page (to be created in Phase 4)
              this.router.navigate(['/k1-import', sessionId, 'verify']);
            } else if (session.status === 'FAILED') {
              this.stopPolling();
              this.error =
                session.errorMessage || 'Extraction failed.';
              this.extractionStatus = 'FAILED';
            }

            this.changeDetectorRef.markForCheck();
          },
          error: () => {
            // Continue polling on transient errors
          }
        });
    }, 2000); // Poll every 2 seconds
  }

  private stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }
}
