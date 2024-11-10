import { GfAssetProfileIconComponent } from '@ghostfolio/client/components/asset-profile-icon/asset-profile-icon.component';
import { GfSymbolModule } from '@ghostfolio/client/pipes/symbol/symbol.module';
import { AdminService } from '@ghostfolio/client/services/admin.service';
import { DataService } from '@ghostfolio/client/services/data.service';
import { getAssetProfileIdentifier } from '@ghostfolio/common/helper';
import { Filter, PortfolioPosition, User } from '@ghostfolio/common/interfaces';
import { DateRange } from '@ghostfolio/common/types';
import { translate } from '@ghostfolio/ui/i18n';

import { FocusKeyManager } from '@angular/cdk/a11y';
import { CommonModule } from '@angular/common';
import {
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  QueryList,
  ViewChild,
  ViewChildren
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormsModule,
  ReactiveFormsModule
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatMenuTrigger } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { RouterModule } from '@angular/router';
import { Account, AssetClass, DataSource } from '@prisma/client';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { EMPTY, Observable, Subject, lastValueFrom } from 'rxjs';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  map,
  mergeMap,
  takeUntil
} from 'rxjs/operators';

import { GfAssistantListItemComponent } from './assistant-list-item/assistant-list-item.component';
import {
  IDateRangeOption,
  ISearchResultItem,
  ISearchResults
} from './interfaces/interfaces';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    GfAssetProfileIconComponent,
    GfAssistantListItemComponent,
    GfSymbolModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    NgxSkeletonLoaderModule,
    ReactiveFormsModule,
    RouterModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'gf-assistant',
  standalone: true,
  styleUrls: ['./assistant.scss'],
  templateUrl: './assistant.html'
})
export class GfAssistantComponent implements OnChanges, OnDestroy, OnInit {
  @HostListener('document:keydown', ['$event']) onKeydown(
    event: KeyboardEvent
  ) {
    if (!this.isOpen) {
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      for (const item of this.assistantListItems) {
        item.removeFocus();
      }

      this.keyManager.onKeydown(event);

      const currentAssistantListItem = this.getCurrentAssistantListItem();

      if (currentAssistantListItem?.linkElement) {
        currentAssistantListItem.linkElement.nativeElement?.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
    } else if (event.key === 'Enter') {
      const currentAssistantListItem = this.getCurrentAssistantListItem();

      if (currentAssistantListItem?.linkElement) {
        currentAssistantListItem.linkElement.nativeElement?.click();
        event.stopPropagation();
      }
    }
  }

  @Input() deviceType: string;
  @Input() hasPermissionToAccessAdminControl: boolean;
  @Input() hasPermissionToChangeDateRange: boolean;
  @Input() hasPermissionToChangeFilters: boolean;
  @Input() user: User;

  @Output() closed = new EventEmitter<void>();
  @Output() dateRangeChanged = new EventEmitter<DateRange>();
  @Output() filtersChanged = new EventEmitter<Filter[]>();

  @ViewChild('menuTrigger') menuTriggerElement: MatMenuTrigger;
  @ViewChild('search', { static: true }) searchElement: ElementRef;

  @ViewChildren(GfAssistantListItemComponent)
  assistantListItems: QueryList<GfAssistantListItemComponent>;

  public static readonly SEARCH_RESULTS_DEFAULT_LIMIT = 5;

  public accounts: Account[] = [];
  public assetClasses: Filter[] = [];
  public dateRangeFormControl = new FormControl<string>(undefined);
  public dateRangeOptions: IDateRangeOption[] = [];
  public filterForm = this.formBuilder.group({
    account: new FormControl<string>(undefined),
    assetClass: new FormControl<string>(undefined),
    holding: new FormControl<PortfolioPosition>(undefined),
    tag: new FormControl<string>(undefined)
  });
  public holdings: PortfolioPosition[] = [];
  public isLoading = false;
  public isOpen = false;
  public placeholder = $localize`Find holding...`;
  public searchFormControl = new FormControl('');
  public searchResults: ISearchResults = {
    assetProfiles: [],
    holdings: []
  };
  public tags: Filter[] = [];

  private filterTypes: Filter['type'][] = [
    'ACCOUNT',
    'ASSET_CLASS',
    'DATA_SOURCE',
    'SYMBOL',
    'TAG'
  ];
  private keyManager: FocusKeyManager<GfAssistantListItemComponent>;
  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private adminService: AdminService,
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private formBuilder: FormBuilder
  ) {}

  public ngOnInit() {
    this.initializeFilterForm();

    this.assetClasses = Object.keys(AssetClass).map((assetClass) => {
      return {
        id: assetClass,
        label: translate(assetClass),
        type: 'ASSET_CLASS'
      };
    });

    this.searchFormControl.valueChanges
      .pipe(
        map((searchTerm) => {
          this.isLoading = true;
          this.searchResults = {
            assetProfiles: [],
            holdings: []
          };

          this.changeDetectorRef.markForCheck();

          return searchTerm;
        }),
        debounceTime(300),
        distinctUntilChanged(),
        mergeMap(async (searchTerm) => {
          const result = {
            assetProfiles: [],
            holdings: []
          } as ISearchResults;

          try {
            if (searchTerm) {
              return await this.getSearchResults(searchTerm);
            }
          } catch {}

          return result;
        }),
        takeUntil(this.unsubscribeSubject)
      )
      .subscribe((searchResults) => {
        this.searchResults = searchResults;
        this.isLoading = false;

        this.changeDetectorRef.markForCheck();
      });
  }

  public ngOnChanges() {
    this.accounts = this.user?.accounts ?? [];

    this.dateRangeOptions = [
      { label: $localize`Today`, value: '1d' },
      {
        label: $localize`Week to date` + ' (' + $localize`WTD` + ')',
        value: 'wtd'
      },
      {
        label: $localize`Month to date` + ' (' + $localize`MTD` + ')',
        value: 'mtd'
      },
      {
        label: $localize`Year to date` + ' (' + $localize`YTD` + ')',
        value: 'ytd'
      },
      {
        label: '1 ' + $localize`year` + ' (' + $localize`1Y` + ')',
        value: '1y'
      }
    ];

    // TODO
    // if (this.user?.settings?.isExperimentalFeatures) {
    //   this.dateRangeOptions = this.dateRangeOptions.concat(
    //     eachYearOfInterval({
    //       end: new Date(),
    //       start: this.user?.dateOfFirstActivity ?? new Date()
    //     })
    //       .map((date) => {
    //         return { label: format(date, 'yyyy'), value: format(date, 'yyyy') };
    //       })
    //       .slice(0, -1)
    //       .reverse()
    //   );
    // }

    this.dateRangeOptions = this.dateRangeOptions.concat([
      {
        label: '5 ' + $localize`years` + ' (' + $localize`5Y` + ')',
        value: '5y'
      },
      { label: $localize`Max`, value: 'max' }
    ]);

    this.dateRangeFormControl.disable({ emitEvent: false });

    if (this.hasPermissionToChangeDateRange) {
      this.dateRangeFormControl.enable({ emitEvent: false });
    }

    this.dateRangeFormControl.setValue(this.user?.settings?.dateRange ?? null);

    this.filterForm.disable({ emitEvent: false });

    if (this.hasPermissionToChangeFilters) {
      this.filterForm.enable({ emitEvent: false });
    }

    this.initializeFilterForm();

    this.tags =
      this.user?.tags
        ?.filter(({ isUsed }) => {
          return isUsed;
        })
        .map(({ id, name }) => {
          return {
            id,
            label: translate(name),
            type: 'TAG'
          };
        }) ?? [];

    if (this.tags.length === 0) {
      this.filterForm.get('tag').disable({ emitEvent: false });
    }
  }

  public hasFilter(aFormValue: { [key: string]: string }) {
    return Object.values(aFormValue).some((value) => {
      return !!value;
    });
  }

  public holdingComparisonFunction(
    option: PortfolioPosition,
    value: PortfolioPosition
  ): boolean {
    if (value === null) {
      return false;
    }

    return (
      getAssetProfileIdentifier(option) === getAssetProfileIdentifier(value)
    );
  }

  public async initialize() {
    this.isLoading = true;
    this.keyManager = new FocusKeyManager(this.assistantListItems).withWrap();
    this.searchResults = {
      assetProfiles: [],
      holdings: []
    };

    for (const item of this.assistantListItems) {
      item.removeFocus();
    }

    this.searchFormControl.setValue('');
    setTimeout(() => {
      this.searchElement?.nativeElement?.focus();
    });

    this.isLoading = false;
    this.setIsOpen(true);

    this.changeDetectorRef.markForCheck();
  }

  public onApplyFilters() {
    this.filtersChanged.emit([
      {
        id: this.filterForm.get('account').value,
        type: 'ACCOUNT'
      },
      {
        id: this.filterForm.get('assetClass').value,
        type: 'ASSET_CLASS'
      },
      {
        id: this.filterForm.get('holding').value?.dataSource,
        type: 'DATA_SOURCE'
      },
      {
        id: this.filterForm.get('holding').value?.symbol,
        type: 'SYMBOL'
      },
      {
        id: this.filterForm.get('tag').value,
        type: 'TAG'
      }
    ]);

    this.onCloseAssistant();
  }

  public onChangeDateRange(dateRangeString: string) {
    this.dateRangeChanged.emit(dateRangeString as DateRange);
  }

  public onCloseAssistant() {
    this.setIsOpen(false);

    this.closed.emit();
  }

  public onResetFilters() {
    this.filtersChanged.emit(
      this.filterTypes.map((type) => {
        return {
          type,
          id: null
        };
      })
    );

    this.onCloseAssistant();
  }

  public setIsOpen(aIsOpen: boolean) {
    this.isOpen = aIsOpen;
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  private getCurrentAssistantListItem() {
    return this.assistantListItems.find(({ getHasFocus }) => {
      return getHasFocus;
    });
  }

  private async getSearchResults(aSearchTerm: string) {
    let assetProfiles: ISearchResultItem[] = [];
    let holdings: ISearchResultItem[] = [];

    if (this.hasPermissionToAccessAdminControl) {
      try {
        assetProfiles = await lastValueFrom(
          this.searchAssetProfiles(aSearchTerm)
        );
        assetProfiles = assetProfiles.slice(
          0,
          GfAssistantComponent.SEARCH_RESULTS_DEFAULT_LIMIT
        );
      } catch {}
    }

    try {
      holdings = await lastValueFrom(this.searchHoldings(aSearchTerm));
      holdings = holdings.slice(
        0,
        GfAssistantComponent.SEARCH_RESULTS_DEFAULT_LIMIT
      );
    } catch {}

    return {
      assetProfiles,
      holdings
    };
  }

  private searchAssetProfiles(
    aSearchTerm: string
  ): Observable<ISearchResultItem[]> {
    return this.adminService
      .fetchAdminMarketData({
        filters: [
          {
            id: aSearchTerm,
            type: 'SEARCH_QUERY'
          }
        ],
        take: GfAssistantComponent.SEARCH_RESULTS_DEFAULT_LIMIT
      })
      .pipe(
        catchError(() => {
          return EMPTY;
        }),
        map(({ marketData }) => {
          return marketData.map(
            ({ assetSubClass, currency, dataSource, name, symbol }) => {
              return {
                currency,
                dataSource,
                name,
                symbol,
                assetSubClassString: translate(assetSubClass)
              };
            }
          );
        }),
        takeUntil(this.unsubscribeSubject)
      );
  }

  private searchHoldings(aSearchTerm: string): Observable<ISearchResultItem[]> {
    return this.dataService
      .fetchPortfolioHoldings({
        filters: [
          {
            id: aSearchTerm,
            type: 'SEARCH_QUERY'
          }
        ],
        range: '1d'
      })
      .pipe(
        catchError(() => {
          return EMPTY;
        }),
        map(({ holdings }) => {
          return holdings.map(
            ({ assetSubClass, currency, dataSource, name, symbol }) => {
              return {
                currency,
                dataSource,
                name,
                symbol,
                assetSubClassString: translate(assetSubClass)
              };
            }
          );
        }),
        takeUntil(this.unsubscribeSubject)
      );
  }

  private initializeFilterForm() {
    this.dataService
      .fetchPortfolioHoldings()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(({ holdings }) => {
        this.holdings = holdings
          .filter(({ assetSubClass }) => {
            return !['CASH'].includes(assetSubClass);
          })
          .sort((a, b) => {
            return a.name?.localeCompare(b.name);
          });
        this.setFilterFormValues();
      });
  }

  private setFilterFormValues() {
    const dataSource = this.user?.settings?.[
      'filters.dataSource'
    ] as DataSource;
    const symbol = this.user?.settings?.['filters.symbol'];
    const selectedHolding = this.holdings.find((holding) => {
      return (
        getAssetProfileIdentifier({
          dataSource: holding.dataSource,
          symbol: holding.symbol
        }) === getAssetProfileIdentifier({ dataSource, symbol })
      );
    });

    this.filterForm.setValue(
      {
        account: this.user?.settings?.['filters.accounts']?.[0] ?? null,
        assetClass: this.user?.settings?.['filters.assetClasses']?.[0] ?? null,
        holding: selectedHolding ?? null,
        tag: this.user?.settings?.['filters.tags']?.[0] ?? null
      },
      {
        emitEvent: false
      }
    );
  }
}
