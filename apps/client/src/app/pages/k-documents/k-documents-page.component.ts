import { FamilyOfficeDataService } from '@ghostfolio/client/services/family-office-data.service';
import type { IKDocument } from '@ghostfolio/common/interfaces';
import { GfKDocumentFormComponent } from '@ghostfolio/ui/k-document-form';

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
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { addIcons } from 'ionicons';
import {
  addOutline,
  arrowBackOutline,
  ellipsisVerticalOutline
} from 'ionicons/icons';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'has-fab page' },
  imports: [
    CommonModule,
    FormsModule,
    GfKDocumentFormComponent,
    MatButtonModule,
    MatFormFieldModule,
    MatMenuModule,
    MatSelectModule,
    MatSortModule,
    MatTableModule,
    NgxSkeletonLoaderModule
  ],
  selector: 'gf-k-documents-page',
  styleUrls: ['./k-documents-page.scss'],
  templateUrl: './k-documents-page.html'
})
export class KDocumentsPageComponent implements OnInit {
  public dataSource = new MatTableDataSource<IKDocument>();
  public displayedColumns = [
    'partnershipName',
    'type',
    'taxYear',
    'filingStatus',
    'ordinaryIncome',
    'actions'
  ];
  public editingDoc: IKDocument | null = null;
  public filterPartnershipId: string | null = null;
  public filterStatus: string | null = null;
  public filterTaxYear: number | null = null;
  public isLoading = true;
  public kDocuments: IKDocument[] = [];
  public newDocPartnershipId: string = '';
  public newDocTaxYear: number;
  public newDocType: string = 'K1';
  public partnerships: { id: string; name: string }[] = [];
  public showForm = false;
  public taxYearOptions: number[] = [];

  public constructor(
    private readonly changeDetectorRef: ChangeDetectorRef,
    private readonly destroyRef: DestroyRef,
    private readonly familyOfficeDataService: FamilyOfficeDataService
  ) {
    addIcons({ addOutline, arrowBackOutline, ellipsisVerticalOutline });

    const currentYear = new Date().getFullYear();
    this.newDocTaxYear = currentYear - 1;

    for (let y = currentYear; y >= currentYear - 10; y--) {
      this.taxYearOptions.push(y);
    }
  }

  public ngOnInit(): void {
    this.fetchPartnerships();
    this.fetchKDocuments();
  }

  public cancelForm(): void {
    this.showForm = false;
    this.editingDoc = null;
    this.changeDetectorRef.markForCheck();
  }

  public editDoc(doc: IKDocument): void {
    this.editingDoc = doc;
    this.showForm = true;
    this.changeDetectorRef.markForCheck();
  }

  public fetchKDocuments(): void {
    this.isLoading = true;
    const params: Record<string, any> = {};

    if (this.filterPartnershipId) {
      params.partnershipId = this.filterPartnershipId;
    }

    if (this.filterTaxYear) {
      params.taxYear = this.filterTaxYear;
    }

    if (this.filterStatus) {
      params.filingStatus = this.filterStatus;
    }

    this.familyOfficeDataService
      .fetchKDocuments(params)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((docs) => {
        this.kDocuments = docs;
        this.dataSource.data = docs;
        this.isLoading = false;
        this.changeDetectorRef.markForCheck();
      });
  }

  public onFormSubmit(event: {
    filingStatus: string;
    data: Record<string, number | string | null>;
  }): void {
    if (this.editingDoc) {
      this.familyOfficeDataService
        .updateKDocument(this.editingDoc.id, {
          data: event.data,
          filingStatus: event.filingStatus
        })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => {
          this.showForm = false;
          this.editingDoc = null;
          this.fetchKDocuments();
        });
    } else {
      if (!this.newDocPartnershipId) {
        return;
      }

      this.familyOfficeDataService
        .createKDocument({
          data: event.data,
          filingStatus: event.filingStatus,
          partnershipId: this.newDocPartnershipId,
          taxYear: this.newDocTaxYear,
          type: this.newDocType
        })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => {
          this.showForm = false;
          this.fetchKDocuments();
        });
    }
  }

  public startCreate(): void {
    this.editingDoc = null;
    this.showForm = true;
    this.changeDetectorRef.markForCheck();
  }

  private fetchPartnerships(): void {
    this.familyOfficeDataService
      .fetchPartnerships()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((partnerships) => {
        this.partnerships = partnerships.map((p) => ({
          id: p.id,
          name: p.name
        }));
        this.changeDetectorRef.markForCheck();
      });
  }
}
